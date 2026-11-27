/**
 * Quitting apps and processes from the list views. Every action asks for
 * confirmation first and reports the outcome in a toast.
 */

import { Alert, confirmAlert, Icon, showToast, Toast } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";
import { AppGroup } from "../data/types";

// The bundle id is passed in as an argument (argv), never pasted into the script
// text, so an unusual id from the database can only ever be treated as data.
const QUIT_APP_SCRIPT = `
on run argv
  tell application id (item 1 of argv) to quit
end run
`;

/**
 * Sends a signal to each PID. Returns how many macOS refused, which happens when
 * the process belongs to another user or the system, or has already exited.
 */
function sendSignal(pids: number[], signal: "SIGTERM" | "SIGKILL"): number {
  let refused = 0;
  for (const pid of pids) {
    try {
      process.kill(pid, signal);
    } catch {
      refused += 1;
    }
  }
  return refused;
}

function describeRefusal(refused: number, total: number): string {
  if (refused === total) {
    return "macOS refused: the process belongs to another user or the system.";
  }
  return refused + " of " + total + " processes could not be signaled.";
}

/**
 * Asks an application to quit the way the Dock does. With a bundle id we go
 * through AppleScript so the app can prompt to save; otherwise we send SIGTERM
 * to its main process.
 */
export async function quitApp(group: AppGroup): Promise<void> {
  const confirmed = await confirmAlert({
    title: "Quit " + group.appName + "?",
    message: "The app is asked to quit normally and may prompt you to save unsaved work.",
    icon: Icon.XMarkCircle,
    primaryAction: { title: "Quit", style: Alert.ActionStyle.Destructive },
  });
  if (!confirmed) {
    return;
  }

  try {
    if (group.bundleId !== null) {
      await runAppleScript(QUIT_APP_SCRIPT, [group.bundleId], { timeout: 5000 });
    } else {
      const refused = sendSignal([group.primaryPid], "SIGTERM");
      if (refused > 0) {
        throw new Error(describeRefusal(refused, 1));
      }
    }
    await showToast({ style: Toast.Style.Success, title: "Asked " + group.appName + " to quit" });
  } catch (error) {
    await showFailureToast(error, { title: "Could not quit " + group.appName });
  }
}

/**
 * Kills every live process in the group immediately. Unsaved work is lost,
 * which the confirmation says plainly.
 */
export async function forceQuitApp(group: AppGroup): Promise<void> {
  const count = group.pids.length;
  const confirmed = await confirmAlert({
    title: "Force Quit " + group.appName + "?",
    message: "Kills " + count + (count === 1 ? " process" : " processes") + " immediately. Unsaved work will be lost.",
    icon: Icon.ExclamationMark,
    primaryAction: { title: "Force Quit", style: Alert.ActionStyle.Destructive },
  });
  if (!confirmed) {
    return;
  }

  const refused = sendSignal(group.pids, "SIGKILL");
  if (refused === 0) {
    await showToast({ style: Toast.Style.Success, title: "Force quit " + group.appName });
  } else {
    await showFailureToast(describeRefusal(refused, count), { title: "Could not force quit " + group.appName });
  }
}

/**
 * Quits one process by PID: SIGTERM asks it to stop, SIGKILL (force) stops it at once.
 */
export async function killProcess(pid: number, name: string, force: boolean): Promise<void> {
  const verb = force ? "Force Quit" : "Quit";
  const confirmed = await confirmAlert({
    title: verb + " " + name + " (PID " + pid + ")?",
    message: force
      ? "The process is killed immediately. If it belongs to an app, the app may crash or relaunch it."
      : "The process is asked to terminate. If it belongs to an app, the app may relaunch it.",
    icon: Icon.XMarkCircle,
    primaryAction: { title: verb, style: Alert.ActionStyle.Destructive },
  });
  if (!confirmed) {
    return;
  }

  const refused = sendSignal([pid], force ? "SIGKILL" : "SIGTERM");
  if (refused === 0) {
    await showToast({ style: Toast.Style.Success, title: (force ? "Killed " : "Terminated ") + name });
  } else {
    await showFailureToast(describeRefusal(1, 1), { title: "Could not quit " + name });
  }
}
