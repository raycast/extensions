import { Alert, confirmAlert, showToast, Toast } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { AppUsage, ProcessInfo } from "../types";
import { canQuitApp, readProcesses, sameProcess } from "./processes";

const execFileAsync = promisify(execFile);

export async function quitApp(app: AppUsage, force = false): Promise<void> {
  try {
    if (!canQuitApp(app) || app.identity.kind !== "app")
      throw new Error("This process cannot be quit from Network Hogs.");
    if (
      force &&
      !(await confirmAlert({
        title: `Force quit ${app.name}?`,
        message: "Unsaved changes may be lost. This stops the app and its observed network processes.",
        primaryAction: { title: "Force Quit", style: Alert.ActionStyle.Destructive },
      }))
    )
      return;
    const current = await readProcesses();
    const live = app.processes.filter((info) => sameProcess(info, current.get(info.pid)));
    if (!live.length) throw new Error("The observed processes have exited. Refresh before trying again.");
    if (force) {
      // Include the main executable even if only helpers currently own network sockets.
      const targets = new Map<number, ProcessInfo>(live.map((info) => [info.pid, info]));
      for (const info of current.values()) {
        if (info.uid === process.getuid?.() && info.executable.startsWith(`${app.identity.path}/Contents/MacOS/`))
          targets.set(info.pid, info);
      }
      for (const info of targets.values()) {
        try {
          process.kill(info.pid, "SIGKILL");
        } catch (error) {
          if (!(error instanceof Error && "code" in error && error.code === "ESRCH")) throw error;
        }
      }
    } else {
      // Pass the path as argv, never interpolate an app name or identifier into AppleScript.
      await execFileAsync(
        "/usr/bin/osascript",
        [
          "-e",
          'on run argv\nif application (item 1 of argv) is running then\ntell application (item 1 of argv) to quit\nelse\nerror "The app is no longer running."\nend if\nend run',
          app.identity.path,
        ],
        { timeout: 20_000 },
      );
    }
    await showToast({
      style: Toast.Style.Success,
      title: force ? `Force quit ${app.name}` : `Asked ${app.name} to quit`,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Could not quit ${app.name}`,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
