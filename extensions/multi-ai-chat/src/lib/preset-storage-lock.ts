import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { mkdir, readdir, rename, rm, rmdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { setTimeout } from "node:timers/promises";

export const PRESET_STORAGE_LOCK_DIRECTORY = join(
  tmpdir(),
  "raycast-multi-ai-chat-presets.lock",
);

const heldLocks = new AsyncLocalStorage<ReadonlySet<string>>();

export async function withPresetStorageLock<T>(
  directory: string,
  operation: () => Promise<T>,
): Promise<T> {
  const lockDirectory = resolve(directory);
  const inherited = heldLocks.getStore();
  if (inherited?.has(lockDirectory)) return operation();

  await mkdir(dirname(lockDirectory), { recursive: true });
  const owner = `owner-${process.pid}-${randomUUID()}`;
  const candidate = `${lockDirectory}.${owner}`;
  await mkdir(candidate);
  try {
    await writeFile(join(candidate, owner), "", { flag: "wx", mode: 0o600 });
    const deadline = performance.now() + 10_000;
    for (;;) {
      try {
        // A populated directory cannot replace another populated directory.
        // Publishing the owner and acquiring the lock are one atomic rename.
        await rename(candidate, lockDirectory);
        break;
      } catch (error) {
        if (!hasCode(error, "EEXIST", "ENOTEMPTY")) throw error;
      }
      await removeDeadOwner(lockDirectory);
      if (performance.now() >= deadline) {
        throw new Error(
          "Another Raycast window is still updating saved prompts. Try again.",
        );
      }
      await setTimeout(10);
    }

    try {
      return await heldLocks.run(
        new Set([...(inherited ?? []), lockDirectory]),
        operation,
      );
    } finally {
      await removeOwner(lockDirectory, owner);
    }
  } finally {
    await rm(candidate, { recursive: true, force: true });
  }
}

async function removeDeadOwner(directory: string): Promise<void> {
  let entries: string[];
  try {
    entries = await readdir(directory);
  } catch (error) {
    if (hasCode(error, "ENOENT")) return;
    throw error;
  }
  for (const owner of entries) {
    const match = /^owner-(\d+)-[\da-f-]+$/.exec(owner);
    if (!match) continue;
    try {
      process.kill(Number(match[1]), 0);
    } catch (error) {
      if (hasCode(error, "ESRCH")) await removeOwner(directory, owner);
    }
  }
}

async function removeOwner(directory: string, owner: string): Promise<void> {
  await rm(join(directory, owner), { force: true });
  try {
    // A contender may already have replaced the now-empty directory. Its
    // distinct owner file makes rmdir fail rather than releasing its lock.
    await rmdir(directory);
  } catch (error) {
    if (!hasCode(error, "ENOENT", "ENOTEMPTY", "EEXIST")) throw error;
  }
}

function hasCode(error: unknown, ...codes: string[]): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    codes.includes(String(error.code))
  );
}
