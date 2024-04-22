import { showToast, Toast } from "@raycast/api";
import { runAppleScript } from "run-applescript";

import { buildScriptEnsuringIINAIsRunning, isValidURL } from "./utils";

export default async () => {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Working on it",
  });

  const url = await runAppleScript(`
    set clipboardContents to the clipboard as text
    return clipboardContents
  `);

  if (isValidURL(url)) {
    toast.style = Toast.Style.Success;
    toast.title = "Opening video in IINA";

    const script = buildScriptEnsuringIINAIsRunning(`
      open location "${url}"
    `);

    await runAppleScript(script);
  } else {
    await showToast({
      style: Toast.Style.Failure,
      title: "Not a valid URL",
    });
  }
};
