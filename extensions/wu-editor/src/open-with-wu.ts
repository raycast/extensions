import { closeMainWindow, getSelectedFinderItems, showToast, Toast } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";
import { openInWu } from "./wu";

export default async function Command() {
  try {
    const paths = await finderPaths();
    if (paths.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Select files or folders in Finder first" });
      return;
    }
    await closeMainWindow();
    await openInWu(paths, false);
  } catch (error) {
    await showFailureToast(error, { title: "Could not open in Wu" });
  }
}

async function finderPaths(): Promise<string[]> {
  let selected;
  try {
    selected = await getSelectedFinderItems();
  } catch {
    return [];
  }
  if (selected.length > 0) {
    return selected.map((item) => item.path);
  }
  const frontFolder = await runAppleScript(
    `tell application "Finder"
      if (count of Finder windows) is 0 then return ""
      return POSIX path of (target of front Finder window as alias)
    end tell`,
  ).catch(() => "");
  return frontFolder ? [frontFolder] : [];
}
