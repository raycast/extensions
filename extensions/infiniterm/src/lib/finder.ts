import { statSync } from "node:fs";
import { dirname } from "node:path";
import { getSelectedFinderItems } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

function isDir(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

// The selected Finder items, exactly as selected; empty when Finder is not frontmost or nothing is selected.
async function selectedPaths(): Promise<string[]> {
  try {
    return (await getSelectedFinderItems()).map((i) => i.path);
  } catch {
    return [];
  }
}

async function frontWindowDir(): Promise<string> {
  const front = await runAppleScript(`
    tell application "Finder"
      if (count of Finder windows) > 0 then
        return POSIX path of (target of front Finder window as alias)
      end if
      return POSIX path of (path to desktop folder)
    end tell
  `);
  return front.replace(/\/$/, "") || "/";
}

// The folders to open: the Finder selection (a selected file contributes its folder),
// else the folder of the front Finder window, else the Desktop.
export async function getFinderDirs(): Promise<string[]> {
  const dirs = [...new Set((await selectedPaths()).map((p) => (isDir(p) ? p : dirname(p))))];
  return dirs.length > 0 ? dirs : [await frontWindowDir()];
}

// The selected files only, for commands that open a file. Empty when no file is selected.
export async function getFinderFiles(): Promise<string[]> {
  return (await selectedPaths()).filter((p) => !isDir(p));
}

// The selection as is (files and folders), else the front window's folder: what a diff is taken of.
export async function getFinderPaths(): Promise<string[]> {
  const paths = await selectedPaths();
  return paths.length > 0 ? paths : [await frontWindowDir()];
}
