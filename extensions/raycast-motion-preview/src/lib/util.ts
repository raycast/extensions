import { showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export const scriptFinderPath = `
if application "Finder" is not running then
    return "Finder not running"
end if

tell application "Finder"
    set filePath to (POSIX path of (target of front window as alias))
    set fileAlias to the selection as alias  
    set fileName to name of fileAlias

    return filePath & fileName
end tell
`;

export const getFocusFinderPath = async () => {
  try {
    return await runAppleScript(scriptFinderPath);
  } catch (e) {
    if (e instanceof Error) {
      await showHUD(`Error: ${e.message}`);
    }
    await showHUD("An unknown error occurred");
  }
};

export const hasExt = (path: string, exts: string | string[]) => {
  const extensions = Array.isArray(exts) ? exts : [exts];
  return extensions.some((ext) => path.endsWith(`.${ext}`));
};
