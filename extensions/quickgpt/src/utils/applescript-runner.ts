import { spawn } from "child_process";

function createAppleScriptFileArguments(scriptPath: string, args: string[]): string[] {
  return [scriptPath, ...args];
}

export function runAppleScriptFile(scriptPath: string, args: string[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("/usr/bin/osascript", createAppleScriptFileArguments(scriptPath, args), {
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";

    child.stderr?.setEncoding("utf8");
    child.stderr?.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr.trim() || `osascript exited with code ${code ?? "unknown"}`));
    });
  });
}

export function runAppleScriptFileDetached(scriptPath: string, args: string[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("/usr/bin/osascript", createAppleScriptFileArguments(scriptPath, args), {
      detached: true,
      stdio: "ignore",
    });

    child.once("error", reject);
    child.once("spawn", () => {
      child.removeListener("error", reject);
      child.unref();
      resolve();
    });
  });
}

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
