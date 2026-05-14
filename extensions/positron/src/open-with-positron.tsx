import { closeMainWindow, getFrontmostApplication, getSelectedFinderItems, showToast, Toast } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";

const POSITRON_APP_NAME = "Positron";

// Function to get current Finder path
const getCurrentFinderPath = async (): Promise<string> => {
  const script = `
    tell application "Finder"
      try
        set currentFolder to (target of front Finder window) as alias
        return POSIX path of currentFolder
      on error
        error "No Finder window is open"
      end try
    end tell
  `;

  try {
    const result = await runAppleScript(script);
    return result.trim();
  } catch {
    throw new Error("No Finder window is open");
  }
};

// Function to get selected Path Finder items
const getSelectedPathFinderItems = async (): Promise<string[]> => {
  const script = `
    tell application "Path Finder"
      set thePaths to {}
      repeat with pfItem in (get selection)
        set the end of thePaths to POSIX path of pfItem
      end repeat
      return thePaths
    end tell
  `;

  try {
    const paths = await runAppleScript(script);
    return paths
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  } catch {
    return [];
  }
};

export default async function main() {
  try {
    let selectedItems: { path: string }[] = [];
    const currentApp = await getFrontmostApplication();

    // Only work with Finder or Path Finder
    if (currentApp.name !== "Finder" && currentApp.name !== "Path Finder") {
      throw new Error("Please run this command from Finder or Path Finder");
    }

    if (currentApp.name === "Finder") {
      selectedItems = await getSelectedFinderItems();
    } else if (currentApp.name === "Path Finder") {
      const paths = await getSelectedPathFinderItems();
      selectedItems = paths.map((p) => ({ path: p }));
    }

    if (selectedItems.length === 0) {
      // Only try to get current path if we're in Finder/Path Finder
      const currentPath = await getCurrentFinderPath();

      // Open current directory in Positron using AppleScript
      await runAppleScript(`
        tell application "${POSITRON_APP_NAME}"
          activate
          open POSIX file "${currentPath}"
        end tell
      `);

      await showToast({
        title: "Opened in Positron",
        style: Toast.Style.Success,
        message: "Opened current directory",
      });
    } else {
      // Open each selected item in Positron using AppleScript
      for (const item of selectedItems) {
        await runAppleScript(`
          tell application "${POSITRON_APP_NAME}"
            activate
            open POSIX file "${item.path}"
          end tell
        `);
      }

      await showToast({
        title: "Opened in Positron",
        style: Toast.Style.Success,
        message: `Opened ${selectedItems.length} item${selectedItems.length > 1 ? "s" : ""}`,
      });
    }

    await closeMainWindow();
  } catch (error) {
    await showFailureToast(error, { title: "Failed to open in Positron" });
  }
}
