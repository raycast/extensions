import { environment, trash } from "@raycast/api";
import { rename, mkdir, copyFile, unlink, readdir, stat } from "fs/promises";
import path from "path";

const PENDING_TRASH_DIR = path.join(environment.supportPath, "pending-trash");

async function ensurePendingTrashDir() {
  await mkdir(PENDING_TRASH_DIR, { recursive: true });
}

async function moveFile(src: string, dest: string): Promise<void> {
  try {
    await rename(src, dest);
  } catch (err: unknown) {
    if (isExdevError(err)) {
      await copyFile(src, dest);
      await unlink(src);
    } else {
      throw err;
    }
  }
}

function isExdevError(err: unknown): err is { code: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "EXDEV"
  );
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
): Promise<number> {
  if (entries.length === 0) return 0;

  let failedCount = 0;

  for (const entry of entries) {
    try {
      const pendingExists = await fileExists(entry.pendingPath);
      if (!pendingExists) continue;

      const originalOccupied = await fileExists(entry.originalPath);
      if (originalOccupied) {
        // Original path is taken (e.g. user replaced the file), just trash the staged copy
        await trash(entry.pendingPath);
      } else {
        // Move back to original location so macOS "Put Back" works, then trash
        await moveFile(entry.pendingPath, entry.originalPath);
        try {
          await trash(entry.originalPath);
        } catch {
          // trash() failed after move — move back to staging so the file isn't silently left at original
          await moveFile(entry.originalPath, entry.pendingPath);
          await trash(entry.pendingPath);
        }
      }
    } catch {
      failedCount += 1;
    }
  }

  return failedCount;
}

export async function cleanupStagingDir(): Promise<number> {
  await ensurePendingTrashDir();
  const entries = await readdir(PENDING_TRASH_DIR);
  if (entries.length === 0) return 0;

  const paths = entries.map((entry: string) =>
    path.join(PENDING_TRASH_DIR, entry),
  );
  await trash(paths);
  return entries.length;
}
