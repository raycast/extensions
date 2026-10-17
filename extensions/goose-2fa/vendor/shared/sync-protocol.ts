/**
 * uTools 与 Raycast 共享的数据源文件协议：文件契约、路径规范化、锁命名与内容比较规则。
 * 两端必须从这里取同一份定义；任一端口自己拼锁名或自己定比较规则，都会让同一文件出现两把锁。
 * 本模块只允许纯函数与常量，不引入平台 API。
 */

export const SYNC_APP = "goose-2fa";
export const SYNC_FILE_VERSION = 2;
/** 数据源文件与 MCP 只读端一致的硬上限。 */
export const SYNC_MAX_BYTES = 5 * 1024 * 1024;
/** 同目录独占写锁：`<数据源文件>.lock`。 */
export const SYNC_LOCK_SUFFIX = ".lock";
/**
 * 抢锁的最长等待时间，两端用同一预算（uTools preload 为同步上下文，只能短暂忙等）。
 * 超时即拒绝写入：锁只能由持有者释放，或由用户在界面上显式清理，绝不按时间自动抢占——
 * 用 mtime 判「残留」不可靠（写入端可能刚好在慢盘/休眠中），删掉活锁会直接造成数据丢失。
 */
export const SYNC_LOCK_WAIT_MS = 250;

/** 锁文件内容里的持有者信息，用于向用户报告残留锁。 */
export interface SyncLockInfo {
  pid: number | null;
  createdAt: number | null;
}

export interface SyncFileStat {
  mtimeMs: number;
  size: number;
}

/**
 * 把路径规范成两端一致的形式：展开 `~`、折叠重复斜杠、解析 `.`/`..`、去掉尾部斜杠。
 * homeDir 由调用方传入（Node 侧是 os.homedir()），保持本模块无平台依赖。
 */
export function normalizeSyncPath(input: string, homeDir = ""): string {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return "";
  let value = trimmed;
  const home = homeDir.replace(/\/+$/, "");
  if (home && (value === "~" || value.startsWith("~/"))) value = `${home}${value.slice(1)}`;
  const absolute = value.startsWith("/");
  const segments: string[] = [];
  for (const part of value.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (segments.length > 0 && segments[segments.length - 1] !== "..") segments.pop();
      else if (!absolute) segments.push("..");
      continue;
    }
    segments.push(part);
  }
  return `${absolute ? "/" : ""}${segments.join("/")}`;
}

/** 加锁目标路径。两端都必须调用它，不能各自拼后缀。 */
export function syncLockPath(filePath: string): string {
  return `${normalizeSyncPath(filePath)}${SYNC_LOCK_SUFFIX}`;
}

/** 内容比较协议：逐字节相等才算同一版本，不做 JSON 语义比较（键序变化也算外部改动）。 */
export function isSameSyncContent(a: string, b: string): boolean {
  return a === b;
}

/** 快速路径：mtime 与 size 都没变才认为文件没被动过；写前的最终依据永远是逐字节内容比较。 */
export function isSameSyncStat(a: SyncFileStat, b: SyncFileStat): boolean {
  return a.mtimeMs === b.mtimeMs && a.size === b.size;
}

/**
 * 解析锁文件内容（`pid\n创建时间\n`），只用于向用户报告残留锁与人工清理决策。
 * 本模块不提供「锁是否过期」这类判定：任何按时间自动删锁的路径都已被移除。
 */
export function parseSyncLockInfo(content: string | null | undefined): SyncLockInfo {
  const lines = (content ?? "").split("\n");
  const pid = Number.parseInt((lines[0] ?? "").trim(), 10);
  const createdAt = Number.parseInt((lines[1] ?? "").trim(), 10);
  return {
    pid: Number.isFinite(pid) ? pid : null,
    createdAt: Number.isFinite(createdAt) ? createdAt : null,
  };
}
