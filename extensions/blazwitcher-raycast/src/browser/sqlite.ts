import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { chmod, copyFile, mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const executeFile = promisify(execFile);
const companions = ["", "-wal", "-journal"];

async function fingerprint(filename: string) {
  try {
    const value = await stat(filename, { bigint: true });
    return `${value.ino}:${value.size}:${value.mtimeNs}:${value.ctimeNs}`;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function execute(database: string, query: string, readonly: boolean) {
  const { stdout } = await executeFile(
    "/usr/bin/sqlite3",
    [
      ...(readonly ? ["-readonly"] : []),
      "-json",
      "-cmd",
      ".timeout 150",
      database,
      query,
    ],
    {
      timeout: 10000,
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  return stdout;
}

/** Chrome 使用独占锁时，读取含 WAL/回滚日志且复制期间未变化的私有临时快照。 */
export async function querySnapshot(database: string, query: string) {
  const directory = await mkdtemp(path.join(tmpdir(), "blazwitcher-history-"));
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const target = path.join(directory, `history-${attempt}`);
      const before = await Promise.all(
        companions.map((suffix) => fingerprint(database + suffix)),
      );
      if (!before[0]) throw new Error("ENOENT: history");
      try {
        for (let i = 0; i < companions.length; i++) {
          if (!before[i]) continue;
          await copyFile(
            database + companions[i],
            target + companions[i],
            constants.COPYFILE_FICLONE,
          );
          await chmod(target + companions[i], 0o600);
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
        throw error;
      }
      const after = await Promise.all(
        companions.map((suffix) => fingerprint(database + suffix)),
      );
      if (before.some((value, i) => value !== after[i])) continue;
      // 仅临时副本允许恢复 WAL/回滚日志。源数据库始终只读。
      const integrity = JSON.parse(
        await execute(target, "PRAGMA quick_check(1);", false),
      );
      if (integrity[0]?.quick_check !== "ok")
        throw new Error("历史快照完整性检查失败，请稍后重新打开命令。");
      return await execute(target, query, false);
    }
    throw new Error(
      "Chrome 历史记录正在更新，暂时无法获取稳定快照，请稍后重新打开命令。",
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export async function queryReadonly(database: string, query: string) {
  try {
    return await execute(database, query, true);
  } catch (error) {
    if (!/database is locked|database is busy|SQLITE_BUSY/.test(String(error)))
      throw error;
    return querySnapshot(database, query);
  }
}
