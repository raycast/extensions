import { copyFile, cp, mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";

import { ensureTrailingNewline } from "./text";

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function readText(path: string, fallback = ""): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return fallback;
    throw error;
  }
}

export async function writeTextAtomically(path: string, content: string, backupRoot?: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  if (await exists(path)) {
    const resolvedBackupRoot = backupRoot ?? join(dirname(path), ".raycast-rime-manager", "backups");
    const backupPath = join(resolvedBackupRoot, timestamp(), basename(path));
    await mkdir(dirname(backupPath), { recursive: true });
    await copyFile(path, backupPath);
  }

  const temporaryPath = `${path}.raycast-rime-manager.tmp`;
  await writeFile(temporaryPath, ensureTrailingNewline(content), "utf8");
  await rename(temporaryPath, path);
}

export async function createFullBackup(userDataDir: string, backupRoot: string): Promise<string> {
  const destination = join(backupRoot, `Rime-${timestamp()}`);
  const sourceRoot = resolve(userDataDir);
  const resolvedBackupRoot = resolve(backupRoot);
  const nestedBackupSegment = resolvedBackupRoot.startsWith(`${sourceRoot}${sep}`)
    ? relative(sourceRoot, resolvedBackupRoot).split(sep)[0]
    : undefined;
  await mkdir(destination, { recursive: true });
  await cp(userDataDir, destination, {
    recursive: true,
    filter: (source) => {
      const item = relative(userDataDir, source);
      if (!item) return true;
      const first = item.split("/")[0];
      return (
        !new Set(["build", ".git", ".raycast-rime-manager", nestedBackupSegment].filter(Boolean)).has(first) &&
        !first.endsWith(".userdb")
      );
    },
  });
  return destination;
}
