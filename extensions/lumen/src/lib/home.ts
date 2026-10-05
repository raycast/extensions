import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";
import { ensureFd, ensureFzf } from "./binaries";

export const HOME_ROOT = homedir();
const MAX_RESULTS = 200;

// Index ~ once per session: fd streams the full file list to a temp file on disk (NOT
// into JS memory). Entries under any `excludePrefixes` (configured workspaces) are
// dropped as the stream passes through, so Home searches outside your scoped corpus.
// Returns the temp file path. Caller deletes it via disposeIndex.
export async function indexHome(excludePrefixes: string[] = []): Promise<string> {
  const fdBin = await ensureFd();
  const dir = await mkdtemp(join(tmpdir(), "lumen-home-"));
  const indexPath = join(dir, "index");
  const writeStream = createWriteStream(indexPath);
  const isExcluded = (p: string) => excludePrefixes.some((pre) => p === pre || p.startsWith(pre + "/"));

  await new Promise<void>((resolve, reject) => {
    // Exclude ~/Library: it isn't hidden so fd would include tens of thousands of app
    // caches/support files — noise for a daily document search.
    const fd = spawn(fdBin, ["--print0", "--absolute-path", "--exclude", "Library", ".", HOME_ROOT], {
      stdio: ["ignore", "pipe", "ignore"],
    });
    let buffer = "";
    fd.stdout.setEncoding("utf8");
    fd.stdout.on("data", (chunk: string) => {
      buffer += chunk;
      let i;
      while ((i = buffer.indexOf("\0")) >= 0) {
        const path = buffer.slice(0, i);
        buffer = buffer.slice(i + 1);
        if (path && !isExcluded(path)) writeStream.write(path + "\0");
      }
    });
    fd.on("error", reject);
    fd.on("close", (code) => {
      if (buffer && !isExcluded(buffer)) writeStream.write(buffer + "\0");
      writeStream.end(() => (code === 0 || code === null ? resolve() : reject(new Error(`fd exited ${code}`))));
    });
  });
  return indexPath;
}

export async function disposeIndex(indexPath: string): Promise<void> {
  try {
    await rm(join(indexPath, ".."), { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
}

// Per keystroke: the fzf binary filters the on-disk index (NUL-separated) and prints the
// top matches to stdout, which we read line-by-line and cap. The whole list never enters
// JS memory. `signal` lets a newer query abort this one.
export async function streamFilter(indexPath: string, query: string, signal: AbortSignal): Promise<string[]> {
  const fzfBin = await ensureFzf();
  return new Promise((resolve, reject) => {
    const child = spawn(fzfBin, ["--read0", "--filter", query], {
      stdio: ["pipe", "pipe", "ignore"],
      signal,
    });
    const out: string[] = [];
    const rl = createInterface({ input: child.stdout });
    rl.on("line", (line) => {
      if (out.length < MAX_RESULTS) out.push(line);
      else child.kill();
    });
    child.on("error", (e) => (signal.aborted ? resolve([]) : reject(e)));
    child.on("close", () => resolve(out));

    // Feed the on-disk index into fzf's stdin. createReadStream auto-closes its fd; ignore
    // EPIPE since fzf may close early once we hit the result cap or a newer query aborts.
    child.stdin.on("error", () => {});
    const stream = createReadStream(indexPath);
    stream.on("error", () => {});
    stream.pipe(child.stdin);
  });
}
