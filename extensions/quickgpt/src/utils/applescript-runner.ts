import { spawn } from "child_process";

export function runAppleScriptDetached(script: string, args: string[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("/usr/bin/osascript", ["-", ...args], {
      detached: true,
      stdio: ["pipe", "ignore", "ignore"],
    });

    let settled = false;

    const rejectOnce = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    child.once("error", rejectOnce);
    child.stdin.once("error", rejectOnce);
    child.stdin.end(script, "utf8", () => {
      if (settled) return;

      settled = true;
      child.removeListener("error", rejectOnce);
      child.stdin.removeListener("error", rejectOnce);
      child.unref();
      resolve();
    });
  });
}
