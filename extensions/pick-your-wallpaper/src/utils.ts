import { FileSystemItem, closeMainWindow, showHUD } from "@raycast/api";
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

/**
 * Lists the images in `directoryPath` and all of its subfolders.
 * Each image is tagged with the top-level subfolder it lives in, which is used as its category.
 */
export async function getWallpaperFiles(directoryPath: string, category?: string): Promise<File[]> {
  try {
    const entries = await readdir(directoryPath);
    const results = await Promise.all(
      entries.map(async (entry) => {
        const filePath = path.join(directoryPath, entry);
        const fileStats = await stat(filePath);
        if (fileStats.isDirectory()) {
          return getWallpaperFiles(filePath, category ?? entry);
        }
        const newFile: File = { name: entry, path: filePath, category };
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
// Errors are written as a single plain line to stderr so they can be shown to the user as-is.
const WINDOWS_SET_WALLPAPER_SCRIPT = `
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
try {
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
} catch {
  [Console]::Error.WriteLine($_.Exception.Message)
  exit 1
}
`;

async function setWindowsWallpaper(file: string) {
  // SystemParametersInfo reports success for missing files and falls back to a blank desktop.
  try {
    await fs.promises.access(file, fs.constants.R_OK);
  } catch {
    throw new Error(`File not found: ${file}`);
  }
  const encodedScript = Buffer.from(WINDOWS_SET_WALLPAPER_SCRIPT, "utf16le").toString("base64");
  try {
    await execFilePromise(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encodedScript],
      { env: { ...process.env, PICK_YOUR_WALLPAPER_PATH: path.resolve(file) }, windowsHide: true }
    );
  } catch (error) {
    // The default message repeats the whole encoded command line; prefer the first line of the script's own error.
    const stderr = error instanceof Error && "stderr" in error ? String(error.stderr).trim().split(/\r?\n/)[0] : "";
    throw new Error(stderr || "PowerShell could not set the wallpaper");
  }
}

export async function showWallpaperError(error: unknown) {
  await showHUD(`Could not set the wallpaper: ${error instanceof Error ? error.message : String(error)}`);
}
