import { execFile, spawn } from "node:child_process";

export interface RunOptions {
  signal?: AbortSignal;
  timeout?: number;
  onLine?: (line: string) => void;
  maxOutput?: number;
}

export function run(
  executable: string,
  args: string[],
  options: RunOptions = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (options.signal?.aborted)
      return reject(new Error("Operation canceled."));
    const child = spawn(executable, args, {
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    let errors = "";
    let pending = "";
    let stopped: string | undefined;
    let killTimer: ReturnType<typeof setTimeout> | undefined;
    const stop = (reason: string) => {
      if (stopped) return;
      stopped = reason;
      if (child.pid && process.platform === "win32") {
        execFile(
          "taskkill.exe",
          ["/PID", String(child.pid), "/T", "/F"],
          { windowsHide: true },
          (error) => {
            if (error) child.kill();
          },
        );
      } else child.kill("SIGTERM");
      killTimer = setTimeout(() => child.kill("SIGKILL"), 5000);
      killTimer.unref();
    };
    const abort = () => stop("Operation canceled.");
    const timer = options.timeout
      ? setTimeout(() => stop("Request timed out. Try again."), options.timeout)
      : undefined;
    options.signal?.addEventListener("abort", abort, { once: true });
    if (options.signal?.aborted) abort();
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      output += chunk;
      if (output.length > (options.maxOutput ?? 20_000_000))
        stop("The response exceeded the size limit.");
      if (options.onLine) {
        pending += chunk;
        const lines = pending.split(/\r?\n/);
        pending = lines.pop() ?? "";
        for (const line of lines) options.onLine(line);
      }
    });
    child.stderr.on("data", (chunk: string) => {
      errors = (errors + chunk).slice(-6000);
    });
    const cleanup = () => {
      clearTimeout(timer);
      clearTimeout(killTimer);
      options.signal?.removeEventListener("abort", abort);
    };
    child.on("error", (error: NodeJS.ErrnoException) => {
      cleanup();
      reject(
        new Error(
          error.code === "ENOENT"
            ? `Program not found: ${executable}. Reopen the command to prepare the components again.`
            : error.message,
        ),
      );
    });
    child.on("close", (code) => {
      cleanup();
      if (pending && options.onLine) options.onLine(pending);
      if (stopped) reject(new Error(stopped));
      else if (code !== 0)
        reject(
          new Error(errors.trim() || `The program exited with code ${code}.`),
        );
      else resolve(output);
    });
  });
}
