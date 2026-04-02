import { environment, trash } from "@raycast/api";
import {
  rename,
  mkdir,
  copyFile,
  unlink,
  readdir,
  stat,
} from "node:fs/promises";
import path from "node:path";

const PENDING_TRASH_DIR = path.join(environment.supportPath, "pending-trash");

async function ensurePendingTrashDir() {
  await mkdir(PENDING_TRASH_DIR, { recursive: true });
}

async function moveFile(src: string, dest: string): Promise<void> {
  try {
    await rename(src, dest);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "EXDEV") {
      await copyFile(src, dest);
      await unlink(src);
    } else {
      throw err;
    }
  }
}

export async function moveToPendingTrash(filePath: string): Promise<string> {
  await ensurePendingTrashDir();
  const baseName = path.basename(filePath);
  const dest = path.join(PENDING_TRASH_DIR, `${Date.now()}-${baseName}`);
  await moveFile(filePath, dest);
  return dest;
}

export async function restoreFromPendingTrash(
  pendingPath: string,
  originalPath: string,
) {
  await moveFile(pendingPath, originalPath);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function commitPendingTrash(
  entries: Array<{ pendingPath: string; originalPath: string }>,
) {
  if (entries.length === 0) return;

  for (const entry of entries) {
    try {
      const pendingExists = await fileExists(entry.pendingPath);
      if (!pendingExists) continue;

      const originalOccupied = await fileExists(entry.originalPath);
      if (originalOccupied) {
        await trash(entry.pendingPath);
      } else {
        await moveFile(entry.pendingPath, entry.originalPath);
        await trash(entry.originalPath);
      }
    } catch {
      // File disappeared between check and operation — skip
    }
  }
}

export async function cleanupStagingDir(): Promise<number> {
  await ensurePendingTrashDir();
  const entries = await readdir(PENDING_TRASH_DIR);
  if (entries.length === 0) return 0;

  const paths = entries.map((e) => path.join(PENDING_TRASH_DIR, e));
  await trash(paths);
  return entries.length;
}
