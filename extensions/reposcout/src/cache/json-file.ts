import { mkdir, rename, writeFile, readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createLogger } from "../utils/logger";
import { type Result, err, ok } from "../utils/result";

const log = createLogger("cache");

/**
 * Small helpers for persisting JSON to disk safely. Writes are atomic (write to
 * a temp file, then rename) so a crash mid-write can never corrupt an existing
 * cache. Reads tolerate missing or corrupt files by returning an error branch,
 * which callers translate into "rebuild from scratch".
 */

/**
 * Read and parse a JSON file. Returns an error branch when the file is missing,
 * unreadable, or not valid JSON — none of which should ever throw.
 */
export async function readJsonFile<T>(filePath: string): Promise<Result<T, Error>> {
  try {
    const raw = await readFile(filePath, "utf8");
    return ok(JSON.parse(raw) as T);
  } catch (cause) {
    return err(cause instanceof Error ? cause : new Error(String(cause)));
  }
}

/**
 * Atomically write `value` as pretty JSON to `filePath`, creating parent
 * directories as needed. The temp file is uniquely named per call so concurrent
 * writers cannot clobber each other's temp file.
 */
export async function writeJsonFileAtomic<T>(
  filePath: string,
  value: T,
  tempSuffix: string,
): Promise<Result<void, Error>> {
  try {
    await mkdir(dirname(filePath), { recursive: true });
    const tempPath = join(dirname(filePath), `.${tempSuffix}.tmp`);
    await writeFile(tempPath, JSON.stringify(value, null, 2), "utf8");
    try {
      await rename(tempPath, filePath);
    } catch (renameError) {
      // Clean up the temp file so failed writes don't leak files.
      await rm(tempPath, { force: true });
      throw renameError;
    }
    return ok(undefined);
  } catch (cause) {
    const error = cause instanceof Error ? cause : new Error(String(cause));
    log.error(`failed to write ${filePath}`, error);
    return err(error);
  }
}
