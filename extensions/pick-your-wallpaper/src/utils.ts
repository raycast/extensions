import { FileSystemItem, closeMainWindow } from "@raycast/api";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { runAppleScript } from "run-applescript";
import { File } from "./types/file";

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

export function isValidFile(file: FileSystemItem) {
  const extname = path.extname(file.path).toLowerCase();
  return [".jpg", ".jpeg", ".png", ".gif", ".heic"].includes(extname);
}
/**
 * Runs the AppleScript and closes the main window afterwards.
 *
 * @remarks
 * The main window is before running the AppleScript to keep the UI snappy.
 *
 * @param appleScript - The AppleScript to run
 * @throws An error when the AppleScript fails to run
 * @returns A promise that is resolved when the AppleScript finished running
 */
export async function runAppleScriptSilently(appleScript: string) {
  await closeMainWindow();
  await runAppleScript(appleScript);
}

export async function getWallpaperFiles(directoryPath: string): Promise<File[]> {
  try {
    const entries = await readdir(directoryPath);
    const results = await Promise.all(
      entries.map(async (entry) => {
        const filePath = path.join(directoryPath, entry);
        const fileStats = await stat(filePath);
        if (fileStats.isDirectory()) {
          return getWallpaperFiles(filePath);
        }
        const newFile = { name: entry, path: filePath };
        return isValidFile(newFile) ? [newFile] : [];
      })
    );
    return results.flat();
  } catch (error) {
    console.error(`Error reading directory ${directoryPath}:`, error);
    return [];
  }
}

export function applyWallpaperUpdate(file: string) {
  return runAppleScriptSilently(`
    tell application "System Events"
      tell appearance preferences
        tell application "System Events"
          tell every desktop
            set picture to "${file}"
          end tell
        end tell
      end tell
    end tell
  `);
}
