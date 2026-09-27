import { getPreferenceValues, LocalStorage } from "@raycast/api";
import path from "node:path";
import { useEffect, useState } from "react";
import { exportAsSyncJson, type SyncSnapshot } from "../../vendor/lib/data-transfer";
import type { AccountData, VaultGroup } from "../../vendor/lib/types";
import {
  isSameSyncContent,
  isSameSyncStat,
  parseSyncLockInfo,
  type SyncFileStat,
  type SyncLockInfo,
} from "../../vendor/shared/sync-protocol";
import { readLocalVault, writeLocalVault } from "./local-vault";
import { clearVaultLock, normalizePath, readVaultFile, resolveVaultPath, writeVaultFile, type VaultFileRead } from "./vault-file";
import { mergeExternalSnapshot } from "./vault-ops";

export type VaultSyncStatus = "idle" | "loading" | "writing" | "success" | "error" | "conflict";

export interface VaultConflict {
  snapshot: SyncSnapshot;
  content: string;
  stat: SyncFileStat;
}

const SOURCE_OVERRIDE_KEY = "goose-2fa-data-source-override";

/** 界面新建文件时保存路径；用户后来修改扩展文件偏好时让新偏好优先。 */
export async function selectCreatedSource(filePath: string): Promise<void> {
  const preference = getPreferenceValues<Preferences>().dataFile || "";
  await LocalStorage.setItem(SOURCE_OVERRIDE_KEY, JSON.stringify({ filePath, preference }));
  await loadVault();
}

export async function clearCreatedSource(): Promise<void> {
  await LocalStorage.removeItem(SOURCE_OVERRIDE_KEY);
  await loadVault();
}

export interface VaultState {
  accounts: AccountData[];
  groups: VaultGroup[];
  trash: AccountData[];
  /** "" = 未配置数据源文件，此时只用 Raycast 本地库。 */
  filePath: string;
  source: "file" | "local";
  status: "loading" | "ready";
  syncStatus: VaultSyncStatus;
  /** 需要用户处理的错误（文件缺失、损坏、写入被拒等）。 */
  message: string | null;
  notice: string | null;
  needsCreate: boolean;
  /** 写盘时被锁挡住：锁文件没有按时间自动清理，需用户确认后显式清理。 */
  lockHeld: SyncLockInfo | null;
  /** Raycast 本地库有无法解析的值：保留原值、停止写入，等用户显式重建或改用数据源文件。 */
  localBroken: boolean;
  conflict: VaultConflict | null;
}

const fileMissingMessage = () => "Data source file is missing or empty. No changes were saved to prevent data loss. You can create a new data source file.";
const WATCH_INTERVAL = 3000;

let state: VaultState = {
  accounts: [],
  groups: [],
  trash: [],
  filePath: "",
  source: "local",
  status: "loading",
  syncStatus: "idle",
  message: null,
  notice: null,
  needsCreate: false,
  lockHeld: null,
  localBroken: false,
  conflict: null,
};

/** 最近一次已确认的磁盘内容；写前必须与它比对，不同则说明外部改过文件。 */
let baseline: { content: string; stat: SyncFileStat } | null = null;

const listeners = new Set<() => void>();

function setState(patch: Partial<VaultState>): void {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

export function getVaultState(): VaultState {
  return state;
}

function messageForRead(read: Exclude<VaultFileRead, { status: "ok" }>): string {
  switch (read.status) {
    case "missing":
    case "empty":
      return fileMissingMessage();
    case "invalid":
      return "File is not a goose-2fa data source. Current data was preserved and writes are disabled. Check the file path.";
    case "too-large":
      return "Data source exceeds the 5 MB limit. Reading and writing are disabled.";
    default:
      return "Cannot read data source. Writes are disabled. Check path permissions.";
  }
}

function useVaultSnapshot(): VaultState {
  const [snapshot, setSnapshot] = useState(state);
  useEffect(() => {
    const listener = () => setSnapshot(state);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return snapshot;
}

/** 读取数据源文件并以它为准；未配置路径时使用 Raycast 本地库。 */
export async function loadVault(): Promise<void> {
  const preferences = getPreferenceValues<Preferences>();
  let selected = preferences.dataFile?.trim() || "";
  try {
    const override = JSON.parse((await LocalStorage.getItem<string>(SOURCE_OVERRIDE_KEY)) || "null") as { filePath?: unknown; preference?: unknown } | null;
    if (override && override.preference === (preferences.dataFile || "") && typeof override.filePath === "string") selected = override.filePath;
  } catch { /* 无效的路径偏好不会覆盖已选文件 */ }
  if (selected && (!path.isAbsolute(normalizePath(selected)) || path.extname(selected).toLowerCase() !== ".json")) {
    setState({ status: "ready", syncStatus: "error", message: "Data source must be an absolute path to a .json file; existing data was not written.", needsCreate: false });
    return;
  }
  const filePath = selected ? resolveVaultPath(selected) : "";
  if (!filePath) {
    const read = await readLocalVault();
    baseline = null;
    if (read.status === "broken") {
      setState({
        accounts: state.accounts,
        groups: state.groups,
        trash: state.trash,
        filePath: "",
        source: "local",
        status: "ready",
        syncStatus: "error",
        message: "Raycast Local Vault contains invalid data. Original values were preserved and writes are disabled. Choose a data source file in preferences or explicitly rebuild the vault.",
        notice: null,
        needsCreate: false,
        localBroken: true,
        conflict: null,
      });
      return;
    }
    setState({
      ...read.snapshot,
      filePath: "",
      source: "local",
      status: "ready",
      syncStatus: "success",
      message: null,
      notice: "No data source file configured; using Raycast Local Vault.",
      needsCreate: false,
      localBroken: false,
      conflict: null,
    });
    return;
  }

  const read = readVaultFile(filePath);
  if (read.status === "ok") {
    const { snapshot, corrected } = mergeExternalSnapshot(read.snapshot, state.accounts);
    baseline = { content: read.content, stat: { mtimeMs: read.mtimeMs, size: read.size } };
    setState({
      ...snapshot,
      filePath,
      source: "file",
      status: "ready",
      syncStatus: "success",
      message: null,
      notice: corrected ? "Data source corrected using the 30-day trash rule and HOTP counter floor." : null,
      needsCreate: false,
      conflict: null,
    });
    if (corrected) void persist(snapshot);
    return;
  }

  // 读不到/解析不了都不当成空库：保留当前数据（或本地库）并停止写入，等用户处理。
  const local = await readLocalVault();
  const fallback = state.accounts.length > 0
    ? { accounts: state.accounts, groups: state.groups, trash: state.trash }
    : (local.status === "ok" ? local.snapshot : { accounts: [], groups: [], trash: [] });
  const missing = read.status === "missing" || read.status === "empty";
  baseline = null;
  setState({
    ...fallback,
    filePath,
    source: "file",
    status: "ready",
    syncStatus: "error",
    message: messageForRead(read),
    notice: null,
    needsCreate: missing,
    localBroken: local.status === "broken",
    conflict: null,
  });
}

/** 手动重新读取数据源文件（以文件为准）。 */
export async function refreshVault(): Promise<void> {
  if (!state.filePath) {
    await loadVault();
    return;
  }
  const read = readVaultFile(state.filePath);
  if (read.status !== "ok") {
    setState({ syncStatus: "error", message: messageForRead(read), conflict: null });
    return;
  }
  const { snapshot, corrected } = mergeExternalSnapshot(read.snapshot, state.accounts);
  baseline = { content: read.content, stat: { mtimeMs: read.mtimeMs, size: read.size } };
  setState({
    ...snapshot,
    status: "ready",
    syncStatus: "success",
    message: null,
    notice: corrected ? "Data source corrected using trash rules and the HOTP counter floor." : "Reloaded from data source file.",
    needsCreate: false,
    conflict: null,
  });
  if (corrected) void persist(snapshot);
}

/** 轮询数据源文件，自动载入外部改动；自身写入不回环。 */
async function pollExternal(): Promise<void> {
  const path = state.filePath;
  if (!path || state.syncStatus === "writing" || state.syncStatus === "conflict") return;
  const read = readVaultFile(path);
  if (read.status !== "ok") {
    if (read.status === "missing" || read.status === "empty") {
      const missing = read.status;
      if (!state.needsCreate) setState({ syncStatus: "error", message: messageForRead({ status: missing }), needsCreate: true });
    }
    return;
  }
  if (baseline && isSameSyncStat({ mtimeMs: read.mtimeMs, size: read.size }, baseline.stat)) return;
  if (baseline && isSameSyncContent(read.content, baseline.content)) {
    baseline = { content: read.content, stat: { mtimeMs: read.mtimeMs, size: read.size } };
    return;
  }
  const { snapshot, corrected } = mergeExternalSnapshot(read.snapshot, state.accounts);
  baseline = { content: read.content, stat: { mtimeMs: read.mtimeMs, size: read.size } };
  setState({
    ...snapshot,
    status: "ready",
    syncStatus: "success",
    message: null,
    notice: "Loaded external changes to the data source file.",
    needsCreate: false,
    conflict: null,
  });
  if (corrected) void persist(snapshot);
}

async function persist(
  snapshot: SyncSnapshot,
  options: { allowCreate?: boolean; overwrite?: boolean; createOnly?: boolean } = {},
): Promise<boolean> {
  if (state.syncStatus === "writing") return false;
  if (!state.filePath) {
    if (state.localBroken && !options.allowCreate) {
      setState({
        syncStatus: "error",
        message: "Local Vault contains invalid data; writes are disabled. Explicitly rebuild it or use a data source file.",
        notice: null,
      });
      return false;
    }
    setState({ syncStatus: "writing" });
    try {
      await writeLocalVault(snapshot);
      setState({ ...snapshot, syncStatus: "success", message: null, notice: null, conflict: null, localBroken: false });
      return true;
    } catch {
      setState({ syncStatus: "error", message: "Could not save the local vault." });
      return false;
    }
  }

  setState({ syncStatus: "writing", lockHeld: null });
  const fresh = readVaultFile(state.filePath);
  if (fresh.status !== "ok") {
    const missing = fresh.status === "missing" || fresh.status === "empty";
    if (!missing || !options.allowCreate) {
      setState({
        syncStatus: "error",
        message: messageForRead(fresh),
        notice: null,
        needsCreate: missing,
        conflict: null,
      });
      return false;
    }
  } else if (!options.overwrite) {
    if (!baseline) {
      setState({
        syncStatus: "conflict",
        message: "Data source has not been verified; writes are disabled. Reload it first.",
        notice: null,
        conflict: { snapshot: fresh.snapshot, content: fresh.content, stat: { mtimeMs: fresh.mtimeMs, size: fresh.size } },
      });
      return false;
    }
    if (!isSameSyncContent(fresh.content, baseline.content)) {
      setState({
        syncStatus: "conflict",
        message: "Another app changed the data source. Your changes were not saved. Choose which version to keep.",
        notice: null,
        conflict: { snapshot: fresh.snapshot, content: fresh.content, stat: { mtimeMs: fresh.mtimeMs, size: fresh.size } },
      });
      return false;
    }
  }

  const serialized = exportAsSyncJson(snapshot.accounts, snapshot.groups, snapshot.trash);
  // 版本依据是逐字节内容，不是 mtime/size：锁内比对，外部一改就拒绝。
  const expectedContent = !options.overwrite && baseline ? baseline.content : null;
  const result = await writeVaultFile(state.filePath, serialized, expectedContent, options.createOnly);
  if (result.status === "ok") {
    baseline = { content: serialized, stat: { mtimeMs: result.mtimeMs, size: result.size } };
    setState({
      ...snapshot,
      syncStatus: "success",
      message: null,
      notice: null,
      needsCreate: false,
      lockHeld: null,
      conflict: null,
    });
    return true;
  }
  if (result.status === "conflict") {
    const reread = readVaultFile(state.filePath);
    if (reread.status === "ok") {
      setState({
        syncStatus: "conflict",
        message: "Another app changed the data source before saving. Your changes were not saved. Choose which version to keep.",
        conflict: { snapshot: reread.snapshot, content: reread.content, stat: { mtimeMs: reread.mtimeMs, size: reread.size } },
      });
      return false;
    }
    setState({ syncStatus: "error", message: messageForRead(reread), notice: null, conflict: null });
    return false;
  }
  const lock = result.status === "locked" ? parseSyncLockInfo(result.lockContent) : null;
  setState({
    syncStatus: "error",
    message: result.status === "locked" ? lockMessage(lock) : "Could not write data source; existing file was not overwritten.",
    notice: null,
    lockHeld: lock,
    conflict: null,
  });
  return false;
}

/** 锁不会按时间自动清理，只能由用户确认后显式清理。 */
function lockMessage(lock: SyncLockInfo | null): string {
  const holder = lock?.pid ? `process ${lock.pid}` : "unknown owner";
  const created = lock?.createdAt ? `, created ${new Date(lock.createdAt).toLocaleString("en-US")}` : "";
  return `Another app is writing the data source (${holder}${created}). Your changes were not saved. Stale locks are never removed automatically: confirm no client is writing before removing the lock and retrying.`;
}

/** 所有改动的唯一入口：只有写盘成功才更新内存，避免出现没保存的“影子数据”。 */
export async function updateVault(
  updater: (snapshot: SyncSnapshot) => SyncSnapshot,
): Promise<boolean> {
  const next = updater({ accounts: state.accounts, groups: state.groups, trash: state.trash });
  return persist(next);
}

/** 用户显式确认：在缺失/空路径上新建数据源文件（写入当前数据）。 */
export async function createDataSource(): Promise<boolean> {
  if (!state.filePath || !state.needsCreate) return false;
  return persist(
    { accounts: state.accounts, groups: state.groups, trash: state.trash },
    { allowCreate: true, overwrite: true, createOnly: true },
  );
}

/** 用户显式清理残留锁文件；不会自动重试写入，避免在用户不知情时覆盖外部改动。 */
export async function clearSyncLock(): Promise<boolean> {
  if (!state.filePath) return false;
  const removed = clearVaultLock(state.filePath);
  setState({ lockHeld: null, syncStatus: "idle", ...(removed ? { message: null } : {}) });
  return removed;
}

/** 用户显式确认：用当前内存数据重建 Raycast 本地库，覆盖无法解析的旧值。 */
export async function resetLocalVault(): Promise<boolean> {
  if (!state.localBroken || state.filePath) return false;
  return persist(
    { accounts: state.accounts, groups: state.groups, trash: state.trash },
    { allowCreate: true, overwrite: true },
  );
}

/** HOTP：先落盘递增，成功才允许输出该验证码（失败即不发送）。 */
export async function consumeHotp(id: string): Promise<boolean> {
  const account = state.accounts.find((candidate) => candidate.id === id);
  if (!account || account.type !== "hotp") return false;
  const accounts = state.accounts.map((candidate) =>
    candidate.id === id ? { ...candidate, counter: candidate.counter + 1 } : candidate,
  );
  return persist({ accounts, groups: state.groups, trash: state.trash });
}

/** 冲突处置：file = 以文件为准；local = 以本地为准（仍按文件抬高 HOTP 下限）。 */
export async function resolveConflict(choice: "file" | "local"): Promise<void> {
  const conflict = state.conflict;
  if (!conflict) return;
  if (choice === "file") {
    const { snapshot, corrected } = mergeExternalSnapshot(conflict.snapshot, state.accounts);
    baseline = { content: conflict.content, stat: conflict.stat };
    setState({
      ...snapshot,
      syncStatus: "success",
      message: null,
      notice: "Local data replaced with file contents.",
      needsCreate: false,
      conflict: null,
    });
    if (corrected) void persist(snapshot);
    return;
  }
  const merged = {
    accounts: mergeExternalSnapshot(
      { accounts: conflict.snapshot.accounts, groups: state.groups, trash: state.trash },
      state.accounts,
    ).snapshot.accounts,
    groups: state.groups,
    trash: state.trash,
  };
  baseline = { content: conflict.content, stat: conflict.stat };
  setState({ conflict: null, message: null, notice: "Local data will replace the data source file." });
  await persist(merged);
}

/** 视图存活期间轮询外部改动；命令被卸载即停止。 */
export function useVaultWatch(): void {
  useEffect(() => {
    const timer = setInterval(() => {
      void pollExternal();
    }, WATCH_INTERVAL);
    return () => clearInterval(timer);
  }, []);
}

/** 命令入口统一用它：启动即重读数据源文件，视图存活期间持续观察外部改动。 */
export function useVault(): VaultState {
  const snapshot = useVaultSnapshot();
  useEffect(() => {
    void loadVault();
  }, []);
  useVaultWatch();
  return snapshot;
}
