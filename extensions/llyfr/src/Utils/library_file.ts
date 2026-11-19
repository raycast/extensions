import Path from "node:path";
import { randomUUID } from "node:crypto";
import { realpath, rename, unlink, writeFile } from "node:fs/promises";

/**
 * The file a `.bib` path really points to. If the configured path is a symbolic
 * link (for example to a shared bibliography), changes must go to its target,
 * not replace the link with a separate copy.
 */
export async function resolveBibfile(bibfile: string): Promise<string> {
  try {
    return await realpath(bibfile);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      // Not created yet: the first import creates it at the configured path.
      return Path.resolve(bibfile);
    }
    throw e;
  }
}

const queues = new Map<string, Promise<unknown>>();

/**
 * Run `task` with exclusive access to `bibfile`: changes to the same file run one
 * after another, so overlapping adds and deletes can't undo each other. `task`
 * receives the resolved path to read and write.
 */
export async function withLibraryLock<T>(bibfile: string, task: (realBibfile: string) => Promise<T>): Promise<T> {
  const real = await resolveBibfile(bibfile);
  const id = process.platform === "win32" ? real.toLowerCase() : real;

  const previous = queues.get(id) ?? Promise.resolve();
  const run = previous.catch(() => {}).then(() => task(real));
  const settled = run.catch(() => {});
  queues.set(id, settled);
  try {
    return await run;
  } finally {
    if (queues.get(id) === settled) {
      queues.delete(id);
    }
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Replace `file` with `content` without ever leaving it half-written: write a
 * temporary file next to it, then rename it over the original. Sync clients and
 * editors can lock the file for a moment, so the rename is retried a few times.
 * Pass the resolved path (see `resolveBibfile`), so a symbolic link isn't replaced.
 */
export async function replaceFile(file: string, content: string) {
  const tmp = Path.join(Path.dirname(file), `.${Path.basename(file)}.${randomUUID()}.llyfr-tmp`);
  await writeFile(tmp, content, { encoding: "utf8", flag: "wx" });
  for (let attempt = 1; ; attempt++) {
    try {
      await rename(tmp, file);
      return;
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      if (attempt < 5 && (code === "EPERM" || code === "EBUSY" || code === "EACCES")) {
        await sleep(200 * attempt);
        continue;
      }
      await unlink(tmp).catch(() => {});
      throw new Error(
        `Could not update ${Path.basename(file)} (${code ?? "unknown error"}). Is it open in another program? Your library was not changed.`,
      );
    }
  }
}
