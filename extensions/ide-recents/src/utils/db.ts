/**
 * 通用 SQLite 数据库读取 / 清理工具
 *
 * 所有基于 VS Code 内核的 IDE（VS Code、Trae、Antigravity 等）都用
 * state.vscdb 里的 ItemTable 保存「最近打开的项目」，但键名并不统一：
 *
 *   ~/.vscode-shared/sharedStorage/state.vscdb          -> history.recentlyOpenedPathsList
 *   ~/Library/.../Code/User/globalStorage/state.vscdb   -> recently.opened
 *   Trae / Antigravity                                  -> history.recentlyOpenedPathsList
 *
 * 不同 VS Code 版本之间也发生过键名迁移，而且同一个 IDE 可能同时存在多个库，
 * 因此这里不对「某个库固定用某个键」做任何假设：对每个真实存在的库同时
 * 尝试所有候选键，合并去重后再展示；写回时也只改命中记录的那个键。
 *
 * 安全性：所有 sqlite3 调用都通过 execFileSync 传参（argv / stdin），
 * 不经过 shell，数据库路径与 SQL 中的特殊字符不会被解释执行。
 */

import { execFileSync } from "child_process";
import { copyFileSync, existsSync } from "fs";
import path from "path";
import type { IDEProvider, ProjectItem } from "../providers/types";

/** 「最近打开的项目」在不同 VS Code 版本中使用的候选键名 */
export const RECENTS_KEYS = [
  "history.recentlyOpenedPathsList",
  "recently.opened",
] as const;

/** sqlite3 可执行文件候选路径（Raycast 的 GUI 进程 PATH 很短，优先用绝对路径） */
const SQLITE_CANDIDATES = [
  "/usr/bin/sqlite3",
  "/opt/homebrew/bin/sqlite3",
  "/usr/local/bin/sqlite3",
];

const SQLITE_TIMEOUT_MS = 10000;
const SQLITE_MAX_BUFFER = 32 * 1024 * 1024;

let cachedSqliteBinary: string | undefined;

function sqliteBinary(): string {
  if (!cachedSqliteBinary) {
    cachedSqliteBinary =
      SQLITE_CANDIDATES.find((candidate) => existsSync(candidate)) ?? "sqlite3";
  }
  return cachedSqliteBinary;
}

/** sqlite3 调用失败时，尽量取出真正有用的那一行错误信息 */
function describeError(error: unknown): string {
  if (error instanceof Error) {
    const stderr = (error as { stderr?: Buffer | string }).stderr;
    const detail = stderr ? String(stderr).trim() : "";
    return detail || error.message;
  }
  return String(error);
}

/**
 * 执行一条 SQL。
 *
 * 语句通过 stdin 送入（execFileSync 的 input），argv 只放可执行文件与库路径，
 * 既避免了 shell 解析，也避免了超长命令行参数的限制。
 */
function runSqlite(dbPath: string, sql: string): string {
  try {
    return execFileSync(sqliteBinary(), [dbPath], {
      input: sql,
      encoding: "utf-8",
      timeout: SQLITE_TIMEOUT_MS,
      maxBuffer: SQLITE_MAX_BUFFER,
    });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      throw new Error("未找到 sqlite3 命令，无法访问 IDE 数据库");
    }
    throw new Error(describeError(error));
  }
}

/** 读取单个键的原始值，不存在或为空时返回 null */
function readRawValue(dbPath: string, key: string): string | null {
  const escapedKey = key.replace(/'/g, "''");
  const output = runSqlite(
    dbPath,
    `SELECT value FROM ItemTable WHERE key = '${escapedKey}' LIMIT 1;\n`,
  );

  // sqlite3 在 list 模式下每条记录占一行，去掉结尾换行即为原始值
  const value = output.replace(/\r?\n$/, "");
  return value.length > 0 ? value : null;
}

export type RecentsContainer = "entries" | "workspaces" | "array";

export interface RecentsPayload {
  container: RecentsContainer;
  root: unknown;
  entries: unknown[];
}

/**
 * 解析一个 recents 值。
 *
 * 兼容三种历史格式：{ entries: [...] }、{ workspaces: [...] }、裸数组。
 * 从第一个 { 或 [ 开始解析，容忍前置噪声（例如 sqlite3 的启动提示）。
 */
export function parseRecentsPayload(raw: string): RecentsPayload | null {
  const start = raw.search(/[[{]/);
  if (start === -1) return null;

  let root: unknown;
  try {
    root = JSON.parse(raw.slice(start));
  } catch {
    return null;
  }

  if (Array.isArray(root)) {
    return { container: "array", root, entries: root };
  }

  if (root && typeof root === "object") {
    const record = root as Record<string, unknown>;
    if (Array.isArray(record.entries)) {
      return { container: "entries", root, entries: record.entries };
    }
    if (Array.isArray(record.workspaces)) {
      return { container: "workspaces", root, entries: record.workspaces };
    }
  }

  return null;
}

export interface RecentsSnapshot extends RecentsPayload {
  dbPath: string;
  /** 该条记录所在的键名 */
  key: string;
}

/** 读取一个数据库里所有候选键中的最近项目记录 */
export function readRecentsSnapshots(dbPath: string): RecentsSnapshot[] {
  const snapshots: RecentsSnapshot[] = [];

  for (const key of RECENTS_KEYS) {
    const raw = readRawValue(dbPath, key);
    if (!raw) continue;

    const payload = parseRecentsPayload(raw);
    if (!payload) continue;

    snapshots.push({ ...payload, dbPath, key });
  }

  return snapshots;
}

/** provider 下所有真实存在的数据库 */
export function resolveDatabasePaths(provider: IDEProvider): string[] {
  return provider.getDatabasePaths().filter((dbPath) => existsSync(dbPath));
}

/**
 * 一条历史记录对应的打开目标。
 */
export interface EntryLocation {
  /**
   * 传给 IDE 的打开目标：
   * - 本地项目为文件系统路径；
   * - 远程 / 虚拟工作区为原始 URI（vscode-remote://、vscode-vfs:// 等）。
   */
  target: string;
  type: ProjectItem["type"];
  /** 非 file: 协议或带 remoteAuthority，本地无法校验其存在性 */
  isRemote: boolean;
  exists: boolean;
}

function locationFromUri(
  uri: string,
  type: ProjectItem["type"],
  forceRemote: boolean,
): EntryLocation | null {
  if (!uri) return null;

  if (forceRemote || !uri.startsWith("file:")) {
    // 远程 / 虚拟工作区：保留原始 URI，交给 IDE 自己解析，
    // 不要在本地解码成路径（那会得到一个必然不存在的本地路径）
    return {
      target: uri,
      type: type === "workspace" ? "workspace" : "remote",
      isRemote: true,
      exists: true,
    };
  }

  const filePath = decodeURIComponent(
    uri.slice("file:".length).replace(/^\/\//, ""),
  );
  return {
    target: filePath,
    type,
    isRemote: false,
    exists: existsSync(filePath),
  };
}

/**
 * 原始记录中我们关心的字段。
 * 真实的 recents JSON 里这些字段可能缺失或类型不同，因此一律按 unknown 处理。
 */
interface RawRecentsEntry {
  folderUri?: unknown;
  fileUri?: unknown;
  remoteAuthority?: unknown;
  label?: unknown;
  workspace?: { configPath?: unknown };
}

function asRecord(entry: unknown): RawRecentsEntry | null {
  return entry && typeof entry === "object" ? (entry as RawRecentsEntry) : null;
}

/** 读取记录自带的显示名（例如 GitHub 远程仓库的 "owner/repo [GitHub]"） */
export function getEntryLabel(entry: unknown): string {
  const record = asRecord(entry);
  return record && typeof record.label === "string" ? record.label.trim() : "";
}

/**
 * 把一条原始记录解析成打开目标；无法识别的记录返回 null。
 */
export function resolveEntryLocation(entry: unknown): EntryLocation | null {
  // 老版本 VS Code 直接把路径存成字符串
  if (typeof entry === "string") {
    return locationFromUri(entry, "folder", false);
  }

  const record = asRecord(entry);
  if (!record) return null;

  const isRemoteEntry = Boolean(record.remoteAuthority);
  const configPath = record.workspace?.configPath;

  if (record.folderUri) {
    return locationFromUri(String(record.folderUri), "folder", isRemoteEntry);
  }
  if (configPath) {
    return locationFromUri(String(configPath), "workspace", isRemoteEntry);
  }
  if (record.fileUri) {
    return locationFromUri(String(record.fileUri), "file", isRemoteEntry);
  }
  if (record.remoteAuthority) {
    const remoteTarget = record.folderUri || record.fileUri;
    return remoteTarget
      ? {
          target: String(remoteTarget),
          type: "remote",
          isRemote: true,
          exists: true,
        }
      : null;
  }

  return null;
}

/** 将原始记录列表解析为 ProjectItem 列表（同一目标只保留一条） */
export function parseEntries(
  entries: unknown[],
  sourceId: string,
): ProjectItem[] {
  const items: ProjectItem[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    const location = resolveEntryLocation(entry);
    if (!location) continue;
    if (seen.has(location.target)) continue;
    seen.add(location.target);

    const label = getEntryLabel(entry);
    const name = label || path.basename(location.target) || location.target;
    const extension = location.isRemote
      ? ""
      : path.extname(location.target).slice(1).toLowerCase();

    items.push({
      id: `${sourceId}:${location.target}`,
      name,
      path: location.target,
      type: location.type,
      extension,
      sources: [sourceId],
      exists: location.exists,
    });
  }

  return items;
}

/** 从一个 IDE provider 读取所有最近项目（覆盖它所有存在的库与候选键） */
export function loadProjectsFromProvider(provider: IDEProvider): ProjectItem[] {
  const items: ProjectItem[] = [];

  for (const dbPath of resolveDatabasePaths(provider)) {
    let snapshots: RecentsSnapshot[];
    try {
      snapshots = readRecentsSnapshots(dbPath);
    } catch {
      // 单个库读取失败（例如被 IDE 独占、文件损坏）不应影响其它 IDE
      continue;
    }

    for (const snapshot of snapshots) {
      items.push(...parseEntries(snapshot.entries, provider.id));
    }
  }

  return items;
}

/** 合并多个 provider 的项目列表，按路径去重，保留多来源 */
export function mergeProjects(allProjects: ProjectItem[]): ProjectItem[] {
  const map = new Map<string, ProjectItem>();

  for (const project of allProjects) {
    const existing = map.get(project.path);
    if (existing) {
      // 合并来源，避免重复
      for (const src of project.sources) {
        if (!existing.sources.includes(src)) {
          existing.sources.push(src);
        }
      }
      if (project.exists === false && project.type !== "remote") {
        existing.exists = false;
      }
    } else {
      map.set(project.path, { ...project });
    }
  }

  return Array.from(map.values());
}

/** 单个 IDE 的清理结果 */
export interface ProviderRemovalResult {
  providerId: string;
  providerName: string;
  /** 实际存在并尝试写入的数据库数量 */
  attemptedDatabases: number;
  /** 成功删除的记录条数 */
  removedCount: number;
  /** 命中的键名 -> 删除条数 */
  removedByKey: Record<string, number>;
  /** 备份失败但写入成功的库（提示用户注意） */
  backupFailures: string[];
  /** 出错信息；有值表示该 IDE 的清理没有完整完成 */
  error?: string;
}

/** 一次清理的整体结果 */
export interface RemovalReport {
  /** 所有 IDE 合计删除的记录条数 */
  totalRemoved: number;
  results: ProviderRemovalResult[];
  /** 出错的 IDE（删除不可信，UI 必须据实提示） */
  failures: ProviderRemovalResult[];
}

/** 写回某个键的完整 JSON 值（含 .bak 备份） */
function writeRecentsValue(
  dbPath: string,
  snapshot: RecentsSnapshot,
  entries: unknown[],
): void {
  let root: unknown;
  if (snapshot.container === "array") {
    root = entries;
  } else {
    root = { ...(snapshot.root as Record<string, unknown>) };
    (root as Record<string, unknown>)[snapshot.container] = entries;
  }

  const json = JSON.stringify(root).replace(/'/g, "''");
  const escapedKey = snapshot.key.replace(/'/g, "''");

  runSqlite(
    dbPath,
    `UPDATE ItemTable SET value = '${json}' WHERE key = '${escapedKey}';\n`,
  );
}

/**
 * 从单个 IDE 的所有数据库中删除指定目标（附带 .bak 备份）。
 *
 * 只回写真正命中记录的那个键，未命中的键保持原样，
 * 因此不会因为「猜错键名」而把某个库的最近项目整体清空。
 */
export function removePathsFromProvider(
  provider: IDEProvider,
  targetsToRemove: string[],
): ProviderRemovalResult {
  const result: ProviderRemovalResult = {
    providerId: provider.id,
    providerName: provider.name,
    attemptedDatabases: 0,
    removedCount: 0,
    removedByKey: {},
    backupFailures: [],
  };

  const removeSet = new Set(targetsToRemove);
  const errors: string[] = [];

  for (const dbPath of resolveDatabasePaths(provider)) {
    const dbLabel = path.basename(path.dirname(dbPath));

    let snapshots: RecentsSnapshot[];
    try {
      snapshots = readRecentsSnapshots(dbPath);
    } catch (error) {
      errors.push(`${dbLabel}: 读取失败（${describeError(error)}）`);
      continue;
    }

    result.attemptedDatabases += 1;

    for (const snapshot of snapshots) {
      const kept = snapshot.entries.filter((entry) => {
        const location = resolveEntryLocation(entry);
        // 解析不了的记录一律保留，避免误删
        return !location || !removeSet.has(location.target);
      });

      const removed = snapshot.entries.length - kept.length;
      if (removed === 0) continue;

      let backupFailed = false;
      try {
        copyFileSync(dbPath, `${dbPath}.bak`);
      } catch {
        backupFailed = true;
      }

      try {
        writeRecentsValue(dbPath, snapshot, kept);
      } catch (error) {
        errors.push(
          `${dbLabel} (${snapshot.key}): 写入失败（${describeError(error)}）`,
        );
        continue;
      }

      result.removedCount += removed;
      result.removedByKey[snapshot.key] =
        (result.removedByKey[snapshot.key] ?? 0) + removed;
      if (backupFailed) {
        result.backupFailures.push(dbPath);
      }
    }
  }

  if (errors.length > 0) {
    result.error = errors.join("；");
  }

  return result;
}

/** 从所有已注册 IDE 的数据库中删除指定目标 */
export function removePathsFromAllDatabases(
  providers: IDEProvider[],
  targetsToRemove: string[],
): RemovalReport {
  const results = providers.map((provider) =>
    removePathsFromProvider(provider, targetsToRemove),
  );

  return {
    totalRemoved: results.reduce((sum, item) => sum + item.removedCount, 0),
    results,
    failures: results.filter((item) => Boolean(item.error)),
  };
}
