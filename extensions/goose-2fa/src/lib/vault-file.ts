import { randomUUID } from "node:crypto";
import {
  closeSync,
  fsyncSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { parseSyncSnapshot, type SyncSnapshot } from "../../../src/lib/data-transfer";
import {
  SYNC_LOCK_WAIT_MS,
  SYNC_MAX_BYTES,
  isSameSyncContent,
  normalizeSyncPath,
  syncLockPath,
} from "../../../shared/sync-protocol";

export type VaultFileRead =
  | { status: "ok"; content: string; snapshot: SyncSnapshot; mtimeMs: number; size: number }
  | { status: "missing" | "empty" | "invalid" | "unreadable" | "too-large" };

export type VaultFileWrite =
  | { status: "ok"; mtimeMs: number; size: number }
  | { status: "conflict" | "error" }
  | { status: "locked"; lockContent: string | null };

/** 纯词法规范化（展开 `~`、折叠 `.`/`..`），非数据源文件路径也用它。 */
export function normalizePath(input: string): string {
  return normalizeSyncPath(input, homedir());
}

/**
 * 数据源文件路径必须解析到真实文件/真实父目录：同一文件经符号链接别名访问时，
 * 不解析就会出现 `/tmp/x.json` 与 `/private/tmp/x.json` 两把锁、两个写入端。
 * 文件不存在时按「真实父目录 + 文件名」解析；父目录也不存在则退回词法路径（写入会因 io 失败）。
 */
export function resolveVaultPath(input: string): string {
  const normalized = normalizePath(input);
  if (!normalized) return "";
  try {
    if (statSync(normalized).isFile()) return realpathSync.native(normalized);
  } catch {
    /* 文件不存在或读不到：继续按父目录解析 */
  }
  try {
    return path.join(realpathSync.native(path.dirname(normalized)), path.basename(normalized));
  } catch {
    return normalized;
  }
}

export function lockPathFor(filePath: string): string {
  return syncLockPath(resolveVaultPath(filePath));
}

/** 读取锁文件原始内容；没有锁文件返回 null。仅用于向用户报告，不用于自动清理。 */
export function readVaultLock(filePath: string): string | null {
  try {
    return readFileSync(lockPathFor(filePath), "utf8");
  } catch {
    return null;
  }
}

/** 用户显式清理残留锁（确认没有任何一端在写入时才可用）。 */
export function clearVaultLock(filePath: string): boolean {
  try {
    unlinkSync(lockPathFor(filePath));
    return true;
  } catch {
    return false;
  }
}

/** 读取并严格校验数据源文件：读不到、空文件、解析失败都不当作空库。 */
export function readVaultFile(filePath: string): VaultFileRead {
  const target = resolveVaultPath(filePath);
  let stats;
  try {
    stats = statSync(target);
  } catch (error) {
    return { status: (error as NodeJS.ErrnoException).code === "ENOENT" ? "missing" : "unreadable" };
  }
  if (!stats.isFile()) return { status: "unreadable" };
  if (stats.size > SYNC_MAX_BYTES) return { status: "too-large" };
  let content: string;
  try {
    content = readFileSync(target, "utf8");
  } catch {
    return { status: "unreadable" };
  }
  if (!content.trim()) return { status: "empty" };
  const snapshot = parseSyncSnapshot(content);
  if (!snapshot) return { status: "invalid" };
  return { status: "ok", content, snapshot, mtimeMs: stats.mtimeMs, size: stats.size };
}

/**
 * 拿锁：只等 SYNC_LOCK_WAIT_MS，超时即失败。
 * 绝不按 mtime 判「过期」删除锁文件——删掉活锁会让两个写入端同时写同一个文件。
 */
async function acquireLock(lockPath: string): Promise<boolean> {
  const deadline = Date.now() + SYNC_LOCK_WAIT_MS;
  for (;;) {
    try {
      writeFileSync(lockPath, `${process.pid}\n${Date.now()}\n`, { flag: "wx", mode: 0o600 });
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") return false;
    }
    if (Date.now() >= deadline) return false;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

/**
 * 原子写入数据源文件：与 uTools 端同样的 temp → fsync → rename，同一把锁。
 * expectedContent 非 null 时在锁内逐字节比对当前文件内容，不一致即 conflict（mtime/size 不是版本依据）。
 */
export async function writeVaultFile(
  filePath: string,
  content: string,
  expectedContent: string | null,
): Promise<VaultFileWrite> {
  const target = resolveVaultPath(filePath);
  const lockPath = lockPathFor(target);
  if (!(await acquireLock(lockPath))) return { status: "locked", lockContent: readVaultLock(target) };
  try {
    if (expectedContent !== null) {
      let current: string | null = null;
      try {
        current = readFileSync(target, "utf8");
      } catch {
        current = null;
      }
      if (current === null || !isSameSyncContent(current, expectedContent)) return { status: "conflict" };
    }
    const directory = path.dirname(target);
    const tempPath = path.join(directory, `.${path.basename(target)}.${process.pid}.${randomUUID()}.tmp`);
    try {
      const fd = openSync(tempPath, "wx", 0o600);
      try {
        writeFileSync(fd, content, { encoding: "utf-8" });
        fsyncSync(fd);
      } finally {
        closeSync(fd);
      }
      renameSync(tempPath, target);
    } catch (error) {
      try {
        unlinkSync(tempPath);
      } catch {
        /* 临时文件可能未创建成功 */
      }
      throw error;
    }
    const written = statSync(target);
    return { status: "ok", mtimeMs: written.mtimeMs, size: written.size };
  } catch (error) {
    console.error("[goose-2fa] write vault file failed:", error);
    return { status: "error" };
  } finally {
    try {
      unlinkSync(lockPath);
    } catch {
      /* 锁已被用户显式清理 */
    }
  }
}
