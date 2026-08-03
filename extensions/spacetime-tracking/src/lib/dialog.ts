import { execFile, spawn } from "child_process";

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

/**
 * Shows a native macOS warning alert (a modal dialog with the yellow caution
 * icon) — far more visible than a HUD, and works from no-view commands. Detached
 * and unref'd so it never blocks the calling command's process.
 */
export function showWarningAlert(message: string, title = "Spacetime Tracking"): void {
  const script = `display alert "${esc(title)}" message "${esc(message)}" as warning buttons {"OK"} default button "OK"`;
  const child = spawn("/usr/bin/osascript", ["-e", script], { detached: true, stdio: "ignore" });
  child.unref();
}

/**
 * Shows a native macOS "Save As" panel and resolves with the chosen POSIX path, or `undefined`
 * if the user cancels. `defaultName` prefills the filename; `defaultDir` sets the initial folder.
 */
export function promptSaveLocation(defaultName: string, defaultDir?: string): Promise<string | undefined> {
  const location = defaultDir ? ` default location (POSIX file "${esc(defaultDir)}")` : "";
  const script = `POSIX path of (choose file name with prompt "Export session to…" default name "${esc(defaultName)}"${location})`;
  return new Promise((resolve) => {
    // No timeout: the panel stays open until the user acts.
    execFile("/usr/bin/osascript", ["-e", script], { encoding: "utf8" }, (err, stdout) => {
      if (err) return resolve(undefined); // user cancelled, or the panel failed to open
      const path = stdout.trim();
      resolve(path || undefined);
    });
  });
}
