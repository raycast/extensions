import fs from "node:fs/promises";
import path from "node:path";
import {
  closeMainWindow,
  getPreferenceValues,
  getSelectedFinderItems,
  getFrontmostApplication,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";

import { runAppleScript } from "./utils/applescript";

/**
 * Get selected items from Path Finder via AppleScript.
 */
async function getSelectedPathFinderItems(): Promise<string[]> {
  const result = await runAppleScript(`
    tell application "Path Finder"
      set thePaths to {}
      repeat with pfItem in (get selection)
        set the end of thePaths to POSIX path of pfItem
      end repeat
      set AppleScript's text item delimiters to linefeed
      return thePaths as text
    end tell
  `);
  return result
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Resolve each selected path to a directory.
 * Directories pass through; files resolve to their parent.
 * Deduplicates results.
 */
async function resolveDirectories(items: { path: string }[]): Promise<string[]> {
  const results = await Promise.all(
    items.map(async (item) => {
      const info = await fs.stat(item.path);
      return info.isDirectory() ? item.path : path.dirname(item.path);
    }),
  );
  return [...new Set(results)];
}

/**
 * Fallback: if nothing is selected, open the current Finder window's directory.
 * Returns false if Finder isn't frontmost or has no open window.
 */
async function fallbackToFinderWindow(): Promise<boolean> {
  const app = await getFrontmostApplication();
  if (app.name !== "Finder") return false;

  const currentDirectory = await runAppleScript(
    `tell application "Finder" to get POSIX path of (target of front window as alias)`,
  );
  if (!currentDirectory) return false;

  await openGhosttyAt(currentDirectory);
  return true;
}

/**
 * Open Ghostty at the given directory using the native AppleScript API.
 * Opens as a new window or tab based on the user's preference.
 * Sets the tab/window title to the directory name.
 */
async function openGhosttyAt(directory: string): Promise<void> {
  const { openWithGhosttyMode } = getPreferenceValues<Preferences.OpenWithGhostty>();

  // AppleScript escapes double-quotes by doubling them: " → ""
  const dirLiteral = `"${directory.replace(/"/g, '""')}"`;
  const directoryName = path.basename(directory);
  const nameLiteral = `"${directoryName.replace(/"/g, '""')}"`;

  const openCommand =
    openWithGhosttyMode === "tab"
      ? `if (count of windows) is 0 then
          set win to new window with configuration cfg
        else
          set win to front window
          set newTab to new tab in win with configuration cfg
          select tab newTab
        end if`
      : `set win to new window with configuration cfg`;

  await runAppleScript(`
    tell application "Ghostty"
      activate
      set cfg to new surface configuration
      set initial working directory of cfg to ${dirLiteral}
      ${openCommand}
      set term to focused terminal of selected tab of win
      try
        perform action ("set_tab_title:" & ${nameLiteral}) on term
        perform action ("set_window_title:" & ${nameLiteral}) on term
      end try
      input text "clear" to term
      send key "enter" to term
      focus term
      activate window win
    end tell
  `);
}

export default async function Command() {
  try {
    let selectedItems: { path: string }[] = [];
    const app = await getFrontmostApplication();

    if (app.name === "Finder") {
      selectedItems = await getSelectedFinderItems();
    } else if (app.name === "Path Finder") {
      const paths = await getSelectedPathFinderItems();
      selectedItems = paths.map((p) => ({ path: p }));
    }

    if (selectedItems.length > 0) {
      const directories = await resolveDirectories(selectedItems);
      for (const dir of directories) {
        await openGhosttyAt(dir);
      }
    } else {
      const ranFallback = await fallbackToFinderWindow();
      if (!ranFallback) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No Finder item selected",
          message: "Select a file or folder in Finder or Path Finder to open in Ghostty.",
        });
      }
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Cannot open in Ghostty",
      message: String(error),
    });
  }
  await closeMainWindow();
  await popToRoot();
}
