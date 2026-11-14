// Kept out of `pixtuoid.ts` so `node:test` can load it: `pixtuoid.ts` imports `@raycast/api`,
// whose `package.json` names `types` but no `main` or `exports`.
import { spawn } from "node:child_process";

/** How long a boot may take to write its ready newline before it counts as hung
 *  and is killed (stderr output does not extend it): Raycast bounds a no-view
 *  command's memory, not its time (https://developers.raycast.com/information/lifecycle),
 *  so a hung boot would leave Start Floating pending for good. The 30 s is an
 *  unmeasured margin over a real boot (about 1 s in the walks), not a measured bound. */
export const READY_DEADLINE_MS = 30_000;

/** A launch whose child exited before it said it was up. */
export class LaunchFailedError extends Error {
  readonly code: number | null;

  constructor(code: number | null, report: string) {
    super(report || `pixtuoid exited ${code === null ? "on a signal" : `with code ${code}`} before its window opened`);
    this.name = "LaunchFailedError";
    this.code = code;
  }
}

/** `stderr` from its last line that starts with `errorPrefix` (the CLI's fatal
 *  report), else all of it: a boot's earlier notices would bury the reason. */
function errorReport(stderr: string, errorPrefix: string): string {
  const lines = stderr.split("\n");
  const at = lines.findLastIndex((line) => line.startsWith(errorPrefix));
  return lines.slice(Math.max(at, 0)).join("\n").trim();
}

/** Spawn `bin` detached and settle once it says it is up: its first newline on
 *  stdout, s6's readiness protocol
 *  (https://skarnet.org/software/s6/notifywhenup.html). An exit first rejects
 *  with its code and its stderr from the last line that starts with
 *  `errorPrefix`; no ready newline within `deadlineMs` kills it and rejects.
 *  Once it is up, the child is let go, so this process can exit while it runs. */
export function launchUntilReady(
  bin: string,
  args: string[],
  errorPrefix: string,
  deadlineMs = READY_DEADLINE_MS,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { detached: true, stdio: ["ignore", "pipe", "pipe"] });
    const letGo = () => {
      child.stdout.destroy();
      child.stderr.destroy();
      child.unref();
    };
    const deadline = setTimeout(() => {
      // SIGKILL: a boot stuck on its main thread never reads the SIGTERM its quit arm queues.
      child.kill("SIGKILL");
      letGo();
      reject(new Error(`pixtuoid did not open its window within ${deadlineMs / 1000} s`));
    }, deadlineMs);
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => (stderr += chunk));
    child.stdout.on("data", (chunk: Buffer) => {
      if (!chunk.includes("\n")) return;
      clearTimeout(deadline);
      letGo();
      resolve();
    });
    // An `error` event with no listener is thrown (https://nodejs.org/api/events.html#error-events);
    // after a settle, a reject is a no-op
    // (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/Promise).
    child.once("error", (e) => {
      clearTimeout(deadline);
      reject(e);
    });
    child.once("close", (code) => {
      clearTimeout(deadline);
      reject(new LaunchFailedError(code, errorReport(stderr, errorPrefix)));
    });
  });
}
