import { mkdir, open, rename, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

/** Long enough to outlast any real read-modify-write here; short enough that a crash self-heals. */
const LOCK_STALE_MS = 10_000;
const LOCK_RETRY_MS = 20;
const LOCK_ATTEMPTS = 100;

/**
 * Serializes a whole read-modify-write across command PROCESSES, which the in-process write
 * queue cannot do.
 *
 * `open(path, "wx")` is the primitive that makes this work: creating a file exclusively is
 * atomic at the filesystem level, so exactly one process wins the race and the rest wait.
 * Compare-and-swap alone is NOT sufficient here — it still leaves a window between the
 * verification read and the write, which a lockstep interleave lands in every time.
 *
 * A lock older than `LOCK_STALE_MS` is treated as abandoned (the holder crashed) and broken,
 * so a dead process cannot wedge the store permanently.
 */
export async function withFileLock<T>(target: string, operation: () => Promise<T>): Promise<T> {
  const lockPath = `${target}.lock`;
  await mkdir(dirname(target), { recursive: true });

  for (let attempt = 0; attempt < LOCK_ATTEMPTS; attempt += 1) {
    let handle;

    try {
      handle = await open(lockPath, "wx");
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code !== "EEXIST") {
        throw error;
      }

      // Held by someone else — unless they died holding it.
      const age = await stat(lockPath)
        .then((stats) => Date.now() - stats.mtimeMs)
        .catch(() => 0);

      if (age > LOCK_STALE_MS) {
        await unlink(lockPath).catch(() => undefined);
      }

      await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_MS));
      continue;
    }

    try {
      return await operation();
    } finally {
      await handle.close().catch(() => undefined);
      await unlink(lockPath).catch(() => undefined);
    }
  }

  throw new Error("Could not save — another Context7 command is still writing. Try again.");
}

/**
 * Raycast runs each command in its own process, so the in-process write queues in the stores
 * do NOT serialize across commands. Two commands writing the same file concurrently could
 * otherwise interleave and leave truncated JSON on disk — which parses as an error, is read as
 * an empty list, and gets permanently overwritten by the next mutation.
 *
 * Writing to a unique temp file and renaming closes that hole: `rename` is atomic within a
 * filesystem, so a reader sees either the whole previous file or the whole new one, never a
 * partial write.
 *
 * ponytail: this makes writes atomic, not transactional. A concurrent read-modify-write from
 * two commands can still lose one update (last writer wins) — bounded to a single add/remove,
 * never to file corruption. Per-file locking is the upgrade if that ever bites.
 */
export async function writeFileAtomic(filePath: string, contents: string) {
  const directory = dirname(filePath);
  await mkdir(directory, { recursive: true });

  // Unique per call: two concurrent writers must not share a temp path.
  const tempPath = join(directory, `.${process.pid}-${Math.random().toString(36).slice(2)}.tmp`);

  try {
    await writeFile(tempPath, contents, "utf8");
    await rename(tempPath, filePath);
  } catch (error) {
    await unlink(tempPath).catch(() => undefined);
    throw error;
  }
}
