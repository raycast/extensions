import { Clipboard, getApplications, open, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { spawnSync } from "node:child_process";

export async function runAppleScript(script: string) {
  if (process.platform !== "darwin") {
    throw new Error("macOS only");
  }

  const locale = process.env.LC_ALL;
  delete process.env.LC_ALL;
  const { stdout, stderr } = spawnSync("osascript", ["-e", script]);
  process.env.LC_ALL = locale;
  if (stderr?.length) throw new Error(stderr.toString());
  return stdout.toString();
}

export type Terminal = Exclude<Arguments.Index["to"], "Clipboard">;
export const isTerminal = (val: string): val is Terminal => val !== "Clipboard" && val !== "Finder";

async function checkApplication(name: Terminal) {
  const applications = await getApplications();
  const app = applications.find((app) => app.name === name);
  if (!app) throw new Error(`${name} not found`);
}
export async function clipboardToApplication(name: Terminal) {
  try {
    const directory = (await Clipboard.readText()) || "";
    await checkApplication(name);
    await open(directory, name);
    await showToast(Toast.Style.Success, "Done");
  } catch (err) {
    await showFailureToast(err);
  }
}
export async function applicationToFinder(name: Terminal) {
  const script = `
    if application "${name}" is not running then
      error "${name} is not running"
    end if

    tell application "Finder" to activate
    tell application "${name}" to activate
    tell application "System Events"
      keystroke "open -a Finder ./"
      key code 76
    end tell
  `;
  try {
    const result = await runAppleScript(script);
    await showToast(Toast.Style.Success, "Done", result);
  } catch (err) {
    await showFailureToast(err);
  }
}
export async function finderToApplication(name: Terminal) {
  const script = `
    if application "Finder" is not running then
        return "Finder is not running"
    end if

    tell application "Finder"
        set pathList to POSIX path of (folder of the front window as alias)
        return pathList
    end tell
  `;
  try {
    const directory = await runAppleScript(script);
    await checkApplication(name);
    await open(directory.trim(), name);
    await showToast(Toast.Style.Success, "Done");
  } catch (err) {
    await showFailureToast(err);
  }
}
