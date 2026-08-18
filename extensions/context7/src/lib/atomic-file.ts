import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

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
