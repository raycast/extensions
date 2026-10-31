import { execFile } from "child_process";
import { promisify } from "util";

const run = promisify(execFile);

/**
 * Run a binary with an explicit argument list.
 *
 * The extension never builds a shell command string from a path or an app name:
 * every external call goes through `execFile`, so nothing a filename contains
 * can be interpreted as shell syntax.
 */
export async function exec(file: string, args: string[], timeout = 15_000): Promise<string> {
  const { stdout } = await run(file, args, { timeout, maxBuffer: 16 * 1024 * 1024 });
  return stdout;
}

/** Run a binary and return an empty string instead of throwing. */
export async function execOrEmpty(file: string, args: string[], timeout = 15_000): Promise<string> {
  try {
    return await exec(file, args, timeout);
  } catch {
    return "";
  }
}

/**
 * Run a binary and return whatever it printed, whether or not it succeeded.
 *
 * Several tools report partial trouble through their exit status while still
 * producing perfectly good output: `lsof` exits 1 even when it finds matches,
 * and `du` exits non-zero when any one path is unreadable. Treating a non-zero
 * exit as "no output" silently loses their answers.
 */
export async function execCapture(file: string, args: string[], timeout = 15_000): Promise<string> {
  try {
    return await exec(file, args, timeout);
  } catch (error) {
    const stdout = (error as { stdout?: unknown }).stdout;
    return typeof stdout === "string" ? stdout : "";
  }
}

/** Read a plist (XML or binary) as JSON via the system `plutil`. */
export async function readPlist(path: string): Promise<Record<string, unknown> | null> {
  const stdout = await execOrEmpty("/usr/bin/plutil", ["-convert", "json", "-o", "-", "--", path], 5_000);
  if (!stdout) return null;
  try {
    const parsed: unknown = JSON.parse(stdout);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Run `tasks` with at most `limit` in flight, preserving input order. */
export async function mapWithLimit<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
