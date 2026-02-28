import { execFile, spawn } from "node:child_process";
import { accessSync } from "node:fs";

const WATCHKEY_PATH = "/usr/local/bin/watchkey";

export function isWatchkeyInstalled(): boolean {
  try {
    accessSync(WATCHKEY_PATH);
    return true;
  } catch {
    return false;
  }
}

export async function installWatchkey(): Promise<void> {
  const tmpDir = "/tmp/watchkey-install";

  // Clean up any leftover from a previous failed install
  await execPromise("rm", ["-rf", tmpDir]).catch(() => {});

  // Clone
  await execPromise("git", ["clone", "https://github.com/Etheirystech/watchkey.git", tmpDir]);

  // Build
  await new Promise<void>((resolve, reject) => {
    const child = spawn("swift", ["build", "-c", "release"], { cwd: tmpDir });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Build failed with code ${code}`));
    });
    child.on("error", reject);
  });

  // Try installing without admin first, escalate if needed
  const installCmd = `install -d /usr/local/bin && install ${tmpDir}/.build/release/watchkey /usr/local/bin/watchkey`;
  try {
    await execPromise("/bin/sh", ["-c", installCmd]);
  } catch {
    // Permission denied — retry with admin privileges via native macOS password dialog
    await new Promise<void>((resolve, reject) => {
      const script = `do shell script "${installCmd}" with administrator privileges`;
      execFile("/usr/bin/osascript", ["-e", script], (error) => {
        if (error) reject(new Error("Installation cancelled or failed"));
        else resolve();
      });
    });
  }

  // Cleanup (ignore errors — install already succeeded)
  await execPromise("rm", ["-rf", tmpDir]).catch(() => {});
}

function execPromise(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, (error, stdout, stderr) => {
      if (error) reject(new Error(stderr.trim() || error.message));
      else resolve(stdout);
    });
  });
}

export async function watchkeySet(service: string, value: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(WATCHKEY_PATH, ["set", service]);
    child.stdin.write(value);
    child.stdin.end();

    let stderr = "";
    child.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `watchkey exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

export async function watchkeyGet(service: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(WATCHKEY_PATH, ["get", service], (error, stdout, stderr) => {
      if (error) reject(new Error(stderr.trim() || error.message));
      else resolve(stdout);
    });
  });
}

export async function watchkeyDelete(service: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(WATCHKEY_PATH, ["delete", service], (error, _stdout, stderr) => {
      if (error) reject(new Error(stderr.trim() || error.message));
      else resolve();
    });
  });
}

export async function watchkeyImport(service: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(WATCHKEY_PATH, ["set", service, "--import"], (error, _stdout, stderr) => {
      if (error) reject(new Error(stderr.trim() || error.message));
      else resolve();
    });
  });
}
