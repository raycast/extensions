import { execFile, spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { environment, Icon } from "@raycast/api";

/**
 * The handful of things that differ between the Mac and the Windows build.
 * Everything else in the extension is platform-neutral.
 */

export const isWindows = process.platform === "win32";

/** The system file manager, for action titles and explanations. */
export const fileManager = isWindows ? "File Explorer" : "Finder";

/** Icon that stands for the system file manager. */
export const fileManagerIcon = isWindows ? Icon.HardDrive : Icon.Finder;

/** How to refer to the computer Raycast is running on. */
export const thisComputer = isWindows ? "This PC" : "This Mac";

/** The same, for use inside a sentence, where "PC" still needs its capitals. */
export const thisComputerInline = isWindows ? "this PC" : "this Mac";

function localAppData(): string {
  return process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
}

/**
 * Where Blip's desktop app hosts its RPC socket.
 *
 * Both paths come from the app's own flavour config: the caches directory with
 * "sock" joined onto it. On Windows that caches directory is
 * %LOCALAPPDATA%\Temp\net.blip.desktop, which sits outside the app's MSIX package.
 */
export const socketPath = isWindows
  ? path.join(localAppData(), "Temp", "net.blip.desktop", "sock")
  : path.join(os.homedir(), "Library/Group Containers/AY8UB8KTUX.blip/Library/Caches/sock");

/** Windows PowerShell, by full path rather than through PATH. */
export function powershell(): string {
  return path.join(process.env.SystemRoot || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
}

export function assetPath(name: string): string {
  return path.join(environment.assetsPath, name);
}

/** Runs one of the extension's PowerShell assets and returns its stdout. */
export function runPowerShellAsset(name: string, args: string[], timeoutMs = 10_000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      powershell(),
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", assetPath(name), ...args],
      { timeout: timeoutMs, windowsHide: true, maxBuffer: 8 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) reject(new Error(stderr.trim() || error.message));
        else resolve(stdout);
      },
    );
  });
}

/**
 * Starts the Blip app.
 *
 * The Mac hands off through `open`, which exits as soon as it is done, so a non-zero
 * exit is a real failure worth reporting. On Windows the launcher is the app itself and
 * stays alive for the whole session, so it has to run detached and success can only
 * mean that it started.
 */
export function openBlip(background = false): Promise<void> {
  if (!isWindows) {
    const args = background ? ["-g", "-b", "net.blip.macos"] : ["-b", "net.blip.macos"];
    return new Promise((resolve, reject) => {
      execFile("open", args, (error) => (error ? reject(error) : resolve()));
    });
  }
  // Blip installs a "blip" app execution alias on Windows, which is on PATH.
  return new Promise((resolve, reject) => {
    const child = spawn("blip.exe", background ? ["--background"] : [], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}
