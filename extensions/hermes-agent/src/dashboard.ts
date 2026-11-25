import { spawn } from "child_process";
import { existsSync } from "fs";
import os from "os";
import path from "path";

/**
 * The hermes launcher in its default install location for this platform, or
 * "hermes" to look it up on PATH when it isn't there.
 * - macOS and Linux: ~/.local/bin/hermes
 * - Windows: %LOCALAPPDATA%\hermes\bin\hermes.exe
 */
export function resolveHermesCommand(): string {
  const candidate =
    process.platform === "win32"
      ? path.join(
          process.env.LOCALAPPDATA ||
            path.join(os.homedir(), "AppData", "Local"),
          "hermes",
          "bin",
          "hermes.exe",
        )
      : path.join(os.homedir(), ".local", "bin", "hermes");
  return existsSync(candidate) ? candidate : "hermes";
}

/**
 * Start `hermes dashboard --no-open` in the background and return once the
 * process has launched. The dashboard keeps running after Raycast closes.
 */
export function startDashboard(): Promise<void> {
  const command = resolveHermesCommand();
  const extraPath =
    process.platform === "win32" ? [] : ["/usr/local/bin", "/usr/bin", "/bin"];
  const searchPath = [
    ...(path.isAbsolute(command) ? [path.dirname(command)] : []),
    ...extraPath,
    process.env.PATH || "",
  ].join(path.delimiter);

  return new Promise((resolve, reject) => {
    const child = spawn(command, ["dashboard", "--no-open"], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
      env: { ...process.env, PATH: searchPath },
    });
    child.once("error", (error) => {
      reject(
        new Error(
          `Could not start ${command} (${error.message}). Run "hermes dashboard" yourself, then try again.`,
        ),
      );
    });
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}
