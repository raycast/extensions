import { getSelectedText } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export const isNotEmpty = (string: string | null | undefined) => {
  return string != null && String(string).length > 0;
};

export const readtext = () =>
  getSelectedText()
    .then((text) => (isNotEmpty(text) ? text : runAppleScript("the clipboard")))
    .catch(() => runAppleScript("the clipboard"))
    .then((text) => (isNotEmpty(text) ? text : ""))
    .catch(() => "");
