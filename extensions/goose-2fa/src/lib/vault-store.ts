import { getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { exportAsSyncJson, type SyncSnapshot } from "../../../src/lib/data-transfer";
import type { AccountData, VaultGroup } from "../../../src/lib/types";
import {
  isSameSyncContent,
  isSameSyncStat,
  parseSyncLockInfo,
  type SyncFileStat,
  type SyncLockInfo,
} from "../../../shared/sync-protocol";
import { readLocalVault, writeLocalVault } from "./local-vault";
import { clearVaultLock, readVaultFile, resolveVaultPath, writeVaultFile, type VaultFileRead } from "./vault-file";
import { mergeExternalSnapshot } from "./vault-ops";

export type VaultSyncStatus = "idle" | "loading" | "writing" | "success" | "error" | "conflict";

export interface VaultConflict {
  snapshot: SyncSnapshot;
  content: string;
  stat: SyncFileStat;
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

const FILE_MISSING_MESSAGE = "数据源文件不存在或为空，未写入以免清空数据。可选择「新建数据源文件」。";
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
      return FILE_MISSING_MESSAGE;
    case "invalid":
      return "数据源文件不是 goose-2fa 数据源格式，已保留当前数据且不会写入。请确认文件路径。";
    case "too-large":
      return "数据源文件超过 5MB 上限，已停止读写。";
    default:
      return "数据源文件无法读取，已停止写入。请检查路径权限。";
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
  const filePath = preferences.dataFile ? resolveVaultPath(preferences.dataFile) : "";
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
        message: "Raycast 本地库有无法解析的数据，已保留原值且不会写入。可在扩展设置里改用数据源文件，或显式重建本地库。",
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
      notice: "未配置数据源文件，使用 Raycast 本地库。",
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
      notice: corrected ? "已按 30 天回收站规则与 HOTP 高水位纠正数据源文件。" : null,
      needsCreate: false,
      conflict: null,
    });
    if (corrected) void persist(snapshot, { allowCreate: true, overwrite: true });
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
    notice: corrected ? "已按回收站规则与 HOTP 高水位纠正数据源文件。" : "已按数据源文件重新载入。",
    needsCreate: false,
    conflict: null,
  });
  if (corrected) void persist(snapshot, { allowCreate: true, overwrite: true });
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
    notice: "已载入数据源文件的外部改动。",
    needsCreate: false,
    conflict: null,
  });
  if (corrected) void persist(snapshot, { allowCreate: true, overwrite: true });
}

async function persist(
  snapshot: SyncSnapshot,
  options: { allowCreate?: boolean; overwrite?: boolean } = {},
): Promise<boolean> {
  if (!state.filePath) {
    if (state.localBroken && !options.allowCreate) {
      setState({
        syncStatus: "error",
        message: "本地库有无法解析的数据，已停止写入。请显式重建本地库或改用数据源文件。",
        notice: null,
      });
      return false;
    }
    await writeLocalVault(snapshot);
    setState({ ...snapshot, syncStatus: "success", message: null, notice: null, conflict: null, localBroken: false });
    return true;
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
        message: "尚未确认过数据源文件内容，已停止写入。请先重新读取文件。",
        notice: null,
        conflict: { snapshot: fresh.snapshot, content: fresh.content, stat: { mtimeMs: fresh.mtimeMs, size: fresh.size } },
      });
      return false;
    }
    if (!isSameSyncContent(fresh.content, baseline.content)) {
      setState({
        syncStatus: "conflict",
        message: "数据源文件已被其他程序修改，本次改动没有写入。请选择以哪边为准。",
        notice: null,
        conflict: { snapshot: fresh.snapshot, content: fresh.content, stat: { mtimeMs: fresh.mtimeMs, size: fresh.size } },
      });
      return false;
    }
  }

  const serialized = exportAsSyncJson(snapshot.accounts, snapshot.groups, snapshot.trash);
  // 版本依据是逐字节内容，不是 mtime/size：锁内比对，外部一改就拒绝。
  const expectedContent = !options.overwrite && baseline ? baseline.content : null;
  const result = await writeVaultFile(state.filePath, serialized, expectedContent);
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
    if (reread.status === "ok" && isSameSyncContent(reread.content, serialized)) {
      baseline = { content: serialized, stat: { mtimeMs: reread.mtimeMs, size: reread.size } };
      setState({ ...snapshot, syncStatus: "success", message: null, conflict: null });
      return true;
    }
    if (reread.status === "ok") {
      setState({
        syncStatus: "conflict",
        message: "数据源文件在写入前被其他程序修改，本次改动没有写入。请选择以哪边为准。",
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
    message: result.status === "locked" ? lockMessage(lock) : "写入数据源文件失败，原有文件未被覆盖。",
    notice: null,
    lockHeld: lock,
    conflict: null,
  });
  return false;
}

/** 锁不会按时间自动清理，只能由用户确认后显式清理。 */
function lockMessage(lock: SyncLockInfo | null): string {
  const holder = lock?.pid ? `持有者进程 ${lock.pid}` : "持有者未知";
  const created = lock?.createdAt ? `，创建于 ${new Date(lock.createdAt).toLocaleString()}` : "";
  return `另一个程序正在写入数据源文件（${holder}${created}），本次改动没有写入。残留锁不会被自动清理：确认没有任何一端在写入后可清理锁文件，再重试。`;
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
  if (!state.filePath) return false;
  return persist(
    { accounts: state.accounts, groups: state.groups, trash: state.trash },
    { allowCreate: true, overwrite: true },
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
      notice: "已按数据源文件内容覆盖本地。",
      needsCreate: false,
      conflict: null,
    });
    if (corrected) void persist(snapshot, { allowCreate: true, overwrite: true });
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
  baseline = null;
  setState({ conflict: null, message: null, notice: "将以本地数据覆盖数据源文件。" });
  await persist(merged, { allowCreate: true, overwrite: true });
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
