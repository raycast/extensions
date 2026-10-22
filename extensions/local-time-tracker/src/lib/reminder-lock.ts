import { spawn } from "node:child_process";

// macOS's built-in lockf holds an OS lock, released automatically when its
// helper exits. Keep the same file (-k): unlinking it would split ownership
// across different inodes. Existing directory locks from older builds are ignored.
export async function withReminderLock<T>(path: string, action: () => Promise<T>): Promise<T> {
  const helper = spawn(
    "/usr/bin/lockf",
    ["-k", "-s", "-t", "0", `${path}.file`, "/bin/sh", "-c", 'printf "locked\\n"; exec /bin/cat >/dev/null'],
    { stdio: ["pipe", "pipe", "pipe"] },
  );
  // A terminated command closes stdin, so the helper exits without a stale lease.
  helper.stdin.on("error", () => {});
  const closed = new Promise<void>((resolve) => {
    helper.once("close", () => resolve());
  });
  try {
    await new Promise<void>((resolve, reject) => {
      let output = "";
      let diagnostics = "";
      helper.stderr.on("data", (chunk: Buffer) => {
        diagnostics += chunk.toString();
      });
      helper.stdout.on("data", (chunk: Buffer) => {
        output += chunk.toString();
        if (output.includes("locked\n")) resolve();
      });
      helper.once("error", reject);
      helper.once("close", (code) => {
        reject(
          new Error(
            code === 75
              ? "Another reminder operation is running. Try again shortly."
              : `Could not acquire reminder lock (${code}): ${diagnostics.trim()}`,
          ),
        );
      });
    });
    return await action();
  } finally {
    helper.stdin.end();
    await closed;
  }
}
