import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { basename, dirname, join } from "node:path";

export function targetPath(
  directory: string | undefined,
  name: string,
): string {
  if (!directory) throw new Error("Choose a directory");
  if (
    !name ||
    name === "." ||
    name === ".." ||
    basename(name) !== name ||
    name.includes("/")
  )
    throw new Error("Enter a file name without a path");
  return join(directory, name);
}

export async function writeJson(
  path: string,
  data: string,
  overwrite: boolean,
): Promise<void> {
  const temp = join(dirname(path), `.json-kit-${randomUUID()}.tmp`);
  let created = false;
  try {
    const handle = await fs.open(temp, "wx", 0o600);
    created = true;
    try {
      await handle.writeFile(data, "utf8");
    } finally {
      await handle.close();
    }
    if (overwrite) {
      await fs.rename(temp, path);
      created = false;
    } else {
      try {
        await fs.link(temp, path);
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (
          !code ||
          !["EPERM", "ENOTSUP", "EOPNOTSUPP", "ENOSYS", "EXDEV"].includes(code)
        )
          throw error;
        await writeExclusive(path, data);
      }
    }
  } finally {
    if (created) await fs.unlink(temp);
  }
}

// Some filesystems do not support hard links. Exclusive creation preserves the
// existing-file check; only remove a partial file if it is still the one we created.
async function writeExclusive(path: string, data: string): Promise<void> {
  const handle = await fs.open(path, "wx", 0o600);
  let identity: Awaited<ReturnType<typeof handle.stat>> | undefined;
  try {
    identity = await handle.stat();
    await handle.writeFile(data, "utf8");
    await handle.close();
  } catch (error) {
    await handle.close().catch(() => undefined);
    try {
      const current = await fs.lstat(path);
      if (
        identity &&
        current.dev === identity.dev &&
        current.ino === identity.ino
      )
        await fs.unlink(path);
    } catch (cleanupError) {
      if ((cleanupError as NodeJS.ErrnoException).code !== "ENOENT")
        throw cleanupError;
    }
    throw error;
  }
}
