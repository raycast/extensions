import { runAppleScript } from "@raycast/utils";
import { closeMainWindow, getSelectedFinderItems, open, showToast, Toast } from "@raycast/api";
import { getGramApp } from "./lib/gram";

export const getCurrentFinderPath = async (): Promise<string> => {
  const getCurrentFinderPathScript = `
      try
        tell application "Finder"
          return POSIX path of (insertion location as alias)
        end tell
      on error
        return ""
      end try
    `;
  return await runAppleScript(getCurrentFinderPathScript);
};

async function getPathsToOpen(): Promise<string[]> {
  const finderItems = await getSelectedFinderItems();
  if (finderItems.length > 0) {
    return finderItems.map((i) => i.path);
  }
  const currentPath = await getCurrentFinderPath();
  if (!currentPath) {
    throw new Error("No Finder item selected or active window found");
  }
  return [currentPath];
}

export default async function openWithGram() {
  try {
    const paths = await getPathsToOpen();
    const app = await getGramApp();

    if (!app) {
      await showToast({
        title: "Gram not found",
        style: Toast.Style.Failure,
        message: "Please install Gram to use this command",
      });
      return;
    }

    for (const path of paths) {
      await open(encodeURI(path), app);
    }
    await closeMainWindow();
  } catch (error) {
    await showToast({
      title: `Failed opening selected Finder item`,
      style: Toast.Style.Failure,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
