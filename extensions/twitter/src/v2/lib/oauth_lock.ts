import { environment } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readdir, rename, rm, rmdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout } from "node:timers/promises";

function hasCode(error: unknown, ...codes: string[]): boolean {
  return codes.includes((error as NodeJS.ErrnoException).code ?? "");
}

async function removeEmptyLock(lockPath: string): Promise<void> {
  try {
    // Never recursively delete the shared path. A new holder may already have
    // published its nonempty directory since we removed the previous owner.
    await rmdir(lockPath);
  } catch (error) {
    if (!hasCode(error, "ENOENT", "ENOTEMPTY", "EEXIST")) throw error;
  }
}

async function recoverDeadOwner(lockPath: string): Promise<void> {
  let entries: string[];
  try {
    entries = await readdir(lockPath);
  } catch (error) {
    if (hasCode(error, "ENOENT")) return;
    throw error;
  }
  for (const owner of entries) {
    const match = /^(\d+)-[0-9a-f-]+\.owner$/.exec(owner);
    if (!match) return;
    const pid = Number(match[1]);
    if (!Number.isSafeInteger(pid) || pid <= 0) return;
    try {
      process.kill(pid, 0);
      return; // A live (including paused) process keeps its lock, regardless of age.
    } catch (error) {
      // EPERM and unknown failures do not establish that the owner is dead.
      if (!hasCode(error, "ESRCH")) return;
    }
    try {
      // The unique filename prevents concurrent recoverers from removing the
      // ownership marker of a replacement holder (even one with a reused PID).
      await unlink(join(lockPath, owner));
    } catch (error) {
      if (!hasCode(error, "ENOENT")) throw error;
    }
  }
  await removeEmptyLock(lockPath);
}

export async function withOAuthLock<T>(operation: () => Promise<T>): Promise<T> {
  await mkdir(environment.supportPath, { recursive: true });
  const lockPath = join(environment.supportPath, "oauth-credentials.lock");
  const candidatePath = await mkdtemp(join(environment.supportPath, "oauth-lock-candidate-"));
  const owner = `${process.pid}-${randomUUID()}.owner`;
  let acquired = false;
  try {
    await writeFile(join(candidatePath, owner), "", { flag: "wx" });
    const deadline = Date.now() + 15_000;
    while (true) {
      try {
        // Publish ownership and the lock together. Renaming onto a nonempty
        // directory fails, so there is no ownerless acquisition window.
        await rename(candidatePath, lockPath);
        acquired = true;
        break;
      } catch (error) {
        if (!hasCode(error, "EEXIST", "ENOTEMPTY", "EPERM", "EACCES")) throw error;
        await recoverDeadOwner(lockPath);
        if (Date.now() >= deadline) {
          throw new Error("Another X command is updating authentication. Retry shortly.");
        }
        await setTimeout(100);
      }
    }
    return await operation();
  } finally {
    if (acquired) {
      await unlink(join(lockPath, owner));
      await removeEmptyLock(lockPath);
    } else {
      // This private, unpublished directory can never belong to another holder.
      await rm(candidatePath, { recursive: true, force: true });
    }
  }
}
