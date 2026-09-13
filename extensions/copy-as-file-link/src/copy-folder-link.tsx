import { Clipboard, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { pathToFileURL } from "node:url";

/**
 * Returns the POSIX path of the front Finder window's target folder.
 * Falls back to the desktop if no window is open.
 */
async function getFrontFinderFolder(): Promise<string | null> {
  const script = `
tell application "Finder"
  try
    if (count of windows) is 0 then
      return POSIX path of (desktop as alias)
    end if
    set t to target of front window
    return POSIX path of (t as alias)
  on error
    return ""
  end try
end tell`;
  const result = (await runAppleScript(script)).trim();
  return result || null;
}

export default async function Command() {
  const folder = await getFrontFinderFolder();
  if (!folder) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No Finder window",
      message: "Open a folder in Finder first.",
    });
    return;
  }

  const link = pathToFileURL(folder).href;
  try {
    await Clipboard.copy(link);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied folder link",
      message: link,
    });
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to copy",
      message: e instanceof Error ? e.message : String(e),
    });
  }
}
