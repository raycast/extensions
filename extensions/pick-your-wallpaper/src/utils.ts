import { FileSystemItem, closeMainWindow } from "@raycast/api";
import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { runAppleScript } from "run-applescript";
import { File } from "./types/file";

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const execFilePromise = promisify(execFile);

const isWindows = process.platform === "win32";

// HEIC is not supported as a desktop picture by Windows out of the box.
export const SUPPORTED_EXTENSIONS = isWindows
  ? [".jpg", ".jpeg", ".png", ".gif"]
  : [".jpg", ".jpeg", ".png", ".gif", ".heic"];

export function isValidFile(file: FileSystemItem) {
  const extname = path.extname(file.path).toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(extname);
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

export async function applyWallpaperUpdate(file: string) {
  if (isWindows) {
    await closeMainWindow();
    await setWindowsWallpaper(file);
    return;
  }
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

// SystemParametersInfoW(SPI_SETDESKWALLPAPER, ..., SPIF_UPDATEINIFILE | SPIF_SENDCHANGE) applies the picture to all monitors.
// The path is passed through an environment variable so it never has to be escaped inside the script.
const WINDOWS_SET_WALLPAPER_SCRIPT = `
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @"
using System.Runtime.InteropServices;
public static class PickYourWallpaper {
  [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  public static extern bool SystemParametersInfo(int uAction, int uParam, string lpvParam, int fuWinIni);
}
"@
if (-not [PickYourWallpaper]::SystemParametersInfo(20, 0, $env:PICK_YOUR_WALLPAPER_PATH, 3)) {
  throw [System.ComponentModel.Win32Exception]::new([System.Runtime.InteropServices.Marshal]::GetLastWin32Error())
}
`;

async function setWindowsWallpaper(file: string) {
  // SystemParametersInfo reports success for missing files and falls back to a blank desktop.
  await fs.promises.access(file, fs.constants.R_OK);
  const encodedScript = Buffer.from(WINDOWS_SET_WALLPAPER_SCRIPT, "utf16le").toString("base64");
  await execFilePromise(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encodedScript],
    { env: { ...process.env, PICK_YOUR_WALLPAPER_PATH: path.resolve(file) }, windowsHide: true }
  );
}
