import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";
import { getSelectedFinderItems, showToast, Toast, open, getFrontmostApplication } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { getNewTabUri } from "./uri";
import { getAppName } from "./constants";

const getSelectedPathFinderItems = async () => {
  const script = `
    tell application "Path Finder"
      set thePaths to {}
      repeat with pfItem in (get selection)
        set the end of thePaths to POSIX path of pfItem
      end repeat
      return thePaths
    end tell
  `;

  const paths = await runAppleScript(script);
  return paths.split(",");
};

const getSelectedExplorerItems = async () => {
  // PowerShell script to get selected items from Windows Explorer
  const script = `try { $paths = @(); $shell = New-Object -ComObject Shell.Application; $windows = $shell.Windows(); for ($i = 0; $i -lt $windows.Count; $i++) { $window = $windows.Item($i); try { $fullName = $window.FullName; if ($fullName -like '*explorer.exe*') { if ($window.Document) { $selection = $window.Document.SelectedItems(); if ($selection.Count -gt 0) { foreach ($item in $selection) { $paths += $item.Path } } } } } catch { } }; if ($paths.Count -gt 0) { $paths -join ',' } else { '' } } catch { '' }`;

  try {
    const result = execSync(`powershell -Command "${script}"`, { encoding: "utf8" });
    const pathLine = result.trim();

    if (pathLine && pathLine.length > 0) {
      const paths = pathLine.split(",").filter((path: string) => path.trim().length > 0);
      return paths;
    }

    return [];
  } catch (error) {
    console.error("Failed to execute PowerShell script:", error);
    return [];
  }
};

const fallback = async (): Promise<boolean> => {
  const app = await getFrontmostApplication();

  if (process.platform === "win32") {
    // For Windows, try to get the current Explorer window path
    const script = `try { $shell = New-Object -ComObject Shell.Application; $windows = $shell.Windows(); foreach ($window in $windows) { if ($window.LocationURL -and $window.FullName -like '*explorer.exe*') { $path = $window.LocationURL -replace 'file:///', '' -replace '/', '\\'; Write-Output $path; break } } } catch { '' }`;

    try {
      const result = execSync(`powershell -Command "${script}"`, { encoding: "utf8" });
      const currentDirectory = result.trim();

      if (currentDirectory) {
        await open(getNewTabUri(currentDirectory));
        return true;
      }
    } catch (error) {
      console.error("Failed to get Explorer path:", error);
    }

    return false;
  }

  if (app.name !== "Finder") {
    return false;
  }

  const currentDirectory = await runAppleScript(
    `tell application "Finder" to get POSIX path of (target of front window as alias)`,
  );

  if (!currentDirectory) {
    return false;
  }

  await open(getNewTabUri(currentDirectory));

  return true;
};

export default async function Command() {
  try {
    let selectedItems: { path: string }[] = [];

    if (process.platform === "win32") {
      // Windows - use PowerShell to get Explorer selection
      const paths = await getSelectedExplorerItems();
      selectedItems = paths.map((p: string) => ({ path: p }));
    } else {
      // macOS - check for Finder or Path Finder
      const app = await getFrontmostApplication();

      if (app.name === "Finder") {
        selectedItems = await getSelectedFinderItems();
      } else if (app.name === "Path Finder") {
        const paths = await getSelectedPathFinderItems();
        selectedItems = paths.map((p) => ({ path: p }));
      }
    }

    if (selectedItems.length === 0) {
      const ranFallback = await fallback();

      if (ranFallback === false) {
        const fileManagerName = process.platform === "win32" ? "File Explorer" : "Finder or Path Finder";
        await showToast({
          style: Toast.Style.Failure,
          title: "No directory selected",
          message: `Please select a directory in ${fileManagerName} to open in ${getAppName()}`,
        });
      }

      return;
    }

    const results = await Promise.all(selectedItems.map((item) => fs.stat(item.path).then((info) => ({ item, info }))));

    results
      .map((result) => (result.info.isDirectory() ? result.item.path : path.dirname(result.item.path)))
      .filter((value, index, self) => self.indexOf(value) === index)
      .forEach((toOpen) => open(getNewTabUri(toOpen)));
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Cannot open selected item in ${getAppName()}`,
      message: String(error),
    });
  }
}
