import { runAppleScript } from "@raycast/utils";

const scriptCopyFile = (path: string) => {
  return `tell app "Finder" to set the clipboard to (POSIX file "${path}")`;
};

export const copyFileByPath = async (path: string) => {
  try {
    await runAppleScript(scriptCopyFile(path));
    return "";
  } catch (e) {
    return String(e);
  }
};
