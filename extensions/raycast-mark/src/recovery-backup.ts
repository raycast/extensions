import * as fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { t } from "./i18n.ts";

const MAX_BACKUP_BYTES = 200 * 1024 * 1024;
const MAX_BACKUP_FILES = 30000;
type Entry = {
  relative: string;
  size: number;
  dev: number;
  ino: number;
  mtimeMs: number;
  ctimeMs: number;
  directory: boolean;
};
function signature(entries: Entry[]) {
  return JSON.stringify(entries);
}
async function ordinaryDirectory(directory: string) {
  let current = path.parse(directory).root;
  for (const segment of directory
    .slice(current.length)
    .split(path.sep)
    .filter(Boolean)) {
    current = path.join(current, segment);
    const stat = await fs.lstat(current);
    if (!stat.isDirectory() || stat.isSymbolicLink())
      throw new Error(t("拒绝非普通文件或符号链接"));
  }
}
async function inventory(root: string): Promise<Entry[]> {
  await ordinaryDirectory(root);
  const entries: Entry[] = [];
  let total = 0;
  async function scan(relative: string) {
    const stat = await fs.lstat(path.join(root, relative));
    if (stat.isSymbolicLink() || (!stat.isDirectory() && !stat.isFile()))
      throw new Error(t("拒绝非普通文件或符号链接"));
    if (entries.length >= MAX_BACKUP_FILES)
      throw new Error(t("恢复备份超过容量上限"));
    entries.push({
      relative,
      size: stat.size,
      dev: stat.dev,
      ino: stat.ino,
      mtimeMs: stat.mtimeMs,
      ctimeMs: stat.ctimeMs,
      directory: stat.isDirectory(),
    });
    if (stat.isDirectory()) {
      for (const child of (await fs.readdir(path.join(root, relative))).sort())
        await scan(path.join(relative, child));
    } else {
      total += stat.size;
      if (total > MAX_BACKUP_BYTES) throw new Error(t("恢复备份超过容量上限"));
    }
  }
  for (const relative of ["events", "icons"]) {
    const stat = await fs.lstat(path.join(root, relative)).catch((error) => {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw error;
    });
    if (stat) {
      if (!stat.isDirectory() || stat.isSymbolicLink())
        throw new Error(t("拒绝非普通文件或符号链接"));
      await scan(relative);
    }
  }
  return entries;
}

/** Raw recovery copy: does not parse events or touch a connected source/settings. */
export async function saveRecoveryBackup(root: string, destination: string) {
  if (!path.isAbsolute(root) || !path.isAbsolute(destination))
    throw new Error(t("导出路径必须是绝对路径"));
  const source = path.resolve(root);
  await ordinaryDirectory(path.dirname(destination));
  const target = path.resolve(destination);
  const relative = path.relative(source, target);
  if (
    !relative ||
    (relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative))
  )
    throw new Error(t("不能导出到事件数据目录"));
  const before = await inventory(source);
  // Use a new destination so a failed copy can never overwrite an earlier recovery backup.
  await fs.mkdir(target, { mode: 0o700 });
  try {
    for (const entry of before) {
      await ordinaryDirectory(path.dirname(path.join(source, entry.relative)));
      const output = path.join(target, entry.relative);
      if (entry.directory) {
        await fs.mkdir(output, { mode: 0o700 });
        continue;
      }
      const input = await fs.open(
        path.join(source, entry.relative),
        fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW,
      );
      try {
        const stat = await input.stat();
        if (
          !stat.isFile() ||
          stat.dev !== entry.dev ||
          stat.ino !== entry.ino ||
          stat.size !== entry.size ||
          stat.mtimeMs !== entry.mtimeMs ||
          stat.ctimeMs !== entry.ctimeMs
        )
          throw new Error(t("数据已变化，请重新打开表单或预览"));
        const bytes = Buffer.alloc(entry.size);
        let offset = 0;
        while (offset < bytes.length) {
          const read = await input.read(
            bytes,
            offset,
            bytes.length - offset,
            offset,
          );
          if (!read.bytesRead)
            throw new Error(t("数据已变化，请重新打开表单或预览"));
          offset += read.bytesRead;
        }
        const after = await input.stat();
        if (
          after.size !== stat.size ||
          after.mtimeMs !== stat.mtimeMs ||
          after.ctimeMs !== stat.ctimeMs
        )
          throw new Error(t("数据已变化，请重新打开表单或预览"));
        await ordinaryDirectory(path.dirname(output));
        const handle = await fs.open(output, "wx", 0o600);
        try {
          await handle.writeFile(bytes);
          await handle.sync();
        } finally {
          await handle.close();
        }
        const copied = await fs.readFile(output);
        if (
          createHash("sha256").update(bytes).digest("hex") !==
          createHash("sha256").update(copied).digest("hex")
        )
          throw new Error(t("恢复备份校验失败"));
      } finally {
        await input.close();
      }
    }
    if (signature(before) !== signature(await inventory(source)))
      throw new Error(t("数据已变化，请重新打开表单或预览"));
  } catch (error) {
    throw new Error(
      `${t("恢复备份不完整；目标已保留，请勿当作完整备份：")}${target}`,
      { cause: error },
    );
  }
}
