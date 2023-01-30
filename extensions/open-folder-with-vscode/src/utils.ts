import { runAppleScript } from "run-applescript";
import { closeMainWindow, showToast, Toast, open } from "@raycast/api";
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
  const { path, build } = options;
  try {
    await open(path, build);
    await closeMainWindow();
  } catch (e: any) {
    await showToast({
      title: "",
      style: Toast.Style.Failure,
      message: e.message,
    });
  }
};
