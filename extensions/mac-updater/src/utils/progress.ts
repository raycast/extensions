import * as fs from "fs";
import { run } from "./shell";
import { progressBar } from "./format";

export type ProgressFn = (label: string) => void;

/**
 * Best-effort: HEAD a URL and return its Content-Length in bytes, or 0 if it
 * can't be determined (server omits it, redirect, network error). Follows
 * redirects and takes the last Content-Length seen.
 */
export async function headContentLength(url: string): Promise<number> {
  try {
    const { stdout } = await run("/usr/bin/curl", [
      "-sIL",
      "--max-time",
      "20",
      "-A",
      "Mac Updater/1.0",
      url,
    ]);
    const matches = [...stdout.matchAll(/content-length:\s*(\d+)/gi)];
    if (matches.length) return parseInt(matches[matches.length - 1][1], 10);
  } catch {
    /* ignore — caller falls back to a byte counter */
  }
  return 0;
}

/**
 * Poll a growing file on disk and emit a progress label as it fills — a unicode
 * bar when the total size is known, otherwise a "NN MB" counter. Returns a
 * stop() function the caller must invoke when the work finishes. Never throws;
 * if the file doesn't exist yet it simply waits.
 */
export function pollFileProgress(
  filePath: string,
  total: number,
  onProgress: ProgressFn,
  label = "Downloading",
): () => void {
  let stopped = false;
  let last = -1;
  let timer: ReturnType<typeof setTimeout>;

  const tick = () => {
    if (stopped) return;
    let size = 0;
    try {
      size = fs.statSync(filePath).size;
    } catch {
      /* not created yet */
    }
    if (total > 0) {
      const pct = Math.min(100, Math.round((size / total) * 100));
      if (pct !== last) {
        last = pct;
        onProgress(`${label} ${progressBar(size, total)}`);
      }
    } else if (size > 0) {
      const mb = Math.round(size / 1_048_576);
      if (mb !== last) {
        last = mb;
        onProgress(`${label} ${mb} MB`);
      }
    }
    if (!stopped) timer = setTimeout(tick, 350);
  };

  timer = setTimeout(tick, 250);
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}
