import { runAppleScript } from "run-applescript";
import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { execSync } from "child_process";
import { OpenWithVScodeOptions } from "./types";

const scriptFinderPath = `
  if application "Finder" is not running then
      return "Finder not running"
  end if

  tell application "Finder"
      return POSIX path of ((insertion location) as alias)
  end tell
`;

export const getFocusFinderPath = async () => {
  try {
    return await runAppleScript(scriptFinderPath);
  } catch (e) {
    await showToast({
      title: "",
      style: Toast.Style.Failure,
      message: "Finder not running",
    });
  }
};

export const openWithVScode = async (options: OpenWithVScodeOptions) => {
  const { terminal, path, build = "code" } = options;
  try {
    const cmd = terminal ? `${terminal} "${build} --folder-uri ${path}"` : `${build} --folder-uri ${path}`;
    execSync(cmd, {
      timeout: 3000,
      windowsHide: true,
      encoding: "utf-8",
    });
    await closeMainWindow();
  } catch (e: any) {
    await showToast({
      title: "",
      style: Toast.Style.Failure,
      message: e.message,
    });
  }
};
