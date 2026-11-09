import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { BusyError, RequestGuard } from "./luxafor-service";

// macOS kernel flock via its system utility. Keep the inode: deleting a locked
// file would allow two owners. Age alone never breaks a live or suspended lock.
// The helper holds the lock until stdin closes, including on Raycast process exit.
export function requestGuard(supportPath: string): RequestGuard {
  return async (onLost) => {
    await mkdir(supportPath, { recursive: true });
    return new Promise((resolve, reject) => {
      const helper = spawn(
        "/usr/bin/lockf",
        [
          "-k",
          "-s",
          "-t",
          "0",
          `${supportPath}/luxafor-request.guard`,
          "/bin/sh",
          "-c",
          "printf 'locked\\n'; exec /bin/cat >/dev/null",
        ],
        { stdio: ["pipe", "pipe", "ignore"] },
      );
      let acquired = false;
      let releasing = false;
      let output = "";
      let closed = false;
      let finishRelease: (() => void) | undefined;
      const unavailable = () => new Error("Request guard unavailable");
      const timer = setTimeout(() => {
        helper.stdin.destroy();
        helper.kill();
        reject(unavailable());
      }, 5_000);
      helper.on("error", () => {
        clearTimeout(timer);
        reject(unavailable());
      });
      helper.stdin.on("error", () => {
        if (acquired && !releasing) onLost();
      });
      helper.on("exit", (code) => {
        closed = true;
        clearTimeout(timer);
        if (!acquired) reject(code === 75 ? new BusyError() : unavailable());
        else if (!releasing) onLost();
        finishRelease?.();
      });
      helper.stdout.on("data", (data: Buffer) => {
        output += data.toString();
        if (acquired || output !== "locked\n") return;
        acquired = true;
        clearTimeout(timer);
        resolve(async () => {
          releasing = true;
          if (closed) return;
          await new Promise<void>((done) => {
            finishRelease = done;
            helper.stdin.end();
          });
        });
      });
    });
  };
}
