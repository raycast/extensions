import { spawn, ChildProcess } from "node:child_process";

export interface PlayHandle {
  done: Promise<void>;
  cancel: () => void;
}

export interface PlayOptions {
  /** If provided, afplay stops after this many ms (afplay -t). */
  maxDurationMs?: number;
}

export function playFile(filePath: string, opts: PlayOptions = {}): PlayHandle {
  let cancelled = false;
  const args: string[] = [];
  if (opts.maxDurationMs && opts.maxDurationMs > 0) {
    args.push("-t", (opts.maxDurationMs / 1000).toFixed(3));
  }
  args.push(filePath);
  const proc: ChildProcess = spawn("afplay", args, { stdio: "ignore" });

  const done = new Promise<void>((resolve, reject) => {
    proc.on("error", (err) => {
      if (cancelled) resolve();
      else reject(err);
    });
    proc.on("close", (code) => {
      if (cancelled) resolve();
      else if (code === 0 || code === null) resolve();
      else reject(new Error(`afplay exited ${code}`));
    });
  });

  return {
    done,
    cancel: () => {
      cancelled = true;
      if (!proc.killed) {
        try {
          proc.kill("SIGTERM");
        } catch {
          /* already gone */
        }
      }
    },
  };
}
