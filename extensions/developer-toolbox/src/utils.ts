import { runAppleScript } from "run-applescript";

export const readFromClipboard = async () => {
  return await runAppleScript("the clipboard");
};
