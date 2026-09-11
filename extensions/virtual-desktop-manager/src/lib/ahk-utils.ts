import { environment, showToast, Toast } from "@raycast/api";
import { exec, execSync, spawn } from "child_process";
import { promisify } from "util";
import * as path from "path";
import * as fs from "fs";

const execAsync = promisify(exec);

/**
 * Path to the scripts in assets (bundled with extension)
 */
const ASSETS_DIR = environment.assetsPath;

/**
 * Path to the scripts directory (in extension's support folder - writable)
 */
export const SCRIPTS_DIR = path.join(environment.supportPath, "scripts");

/**
 * Path to the VD.ahk library
 */
export const VD_LIBRARY_PATH = path.join(SCRIPTS_DIR, "VD.ahk");

/**
 * Path to the keybindings.ahk script
 */
export const KEYBINDINGS_SCRIPT_PATH = path.join(SCRIPTS_DIR, "keybindings.ahk");

/**
 * Default AutoHotkey v2 installation paths (v2.1-alpha prioritized)
 */
const AHK_PATHS = [
  // v2.1-alpha paths (required for VD.ahk)
  "C:\\Program Files\\AutoHotkey\\v2.1-alpha.5\\AutoHotkey64.exe",
  "C:\\Program Files\\AutoHotkey\\v2.1-alpha.5\\AutoHotkey32.exe",
  "C:\\Program Files\\AutoHotkey\\v2.1-alpha.14\\AutoHotkey64.exe",
  "C:\\Program Files\\AutoHotkey\\v2.1-alpha.14\\AutoHotkey32.exe",
  // Standard v2 paths (may not work with VD.ahk)
  "C:\\Program Files\\AutoHotkey\\v2\\AutoHotkey64.exe",
  "C:\\Program Files\\AutoHotkey\\v2\\AutoHotkey32.exe",
  "C:\\Program Files\\AutoHotkey\\AutoHotkey64.exe",
  "C:\\Program Files\\AutoHotkey\\AutoHotkey.exe",
  "C:\\Program Files (x86)\\AutoHotkey\\AutoHotkey.exe",
];

/**
 * Ensure the scripts directory exists and scripts are copied there
 */
export function ensureScriptsDir(): void {
  // Create scripts directory if it doesn't exist
  if (!fs.existsSync(SCRIPTS_DIR)) {
    fs.mkdirSync(SCRIPTS_DIR, { recursive: true });
  }

  // Copy VD.ahk
  const vdSource = path.join(ASSETS_DIR, "VD.ahk");
  if (fs.existsSync(vdSource)) {
    if (!fs.existsSync(VD_LIBRARY_PATH)) {
      fs.copyFileSync(vdSource, VD_LIBRARY_PATH);
    } else {
      const sourceStats = fs.statSync(vdSource);
      const destStats = fs.statSync(VD_LIBRARY_PATH);
      if (sourceStats.mtime > destStats.mtime) {
        fs.copyFileSync(vdSource, VD_LIBRARY_PATH);
      }
    }
  }

  // Copy keybindings.ahk if it doesn't exist (preserve user edits)
  const keybindingsSource = path.join(ASSETS_DIR, "keybindings.ahk");
  if (fs.existsSync(keybindingsSource) && !fs.existsSync(KEYBINDINGS_SCRIPT_PATH)) {
    fs.copyFileSync(keybindingsSource, KEYBINDINGS_SCRIPT_PATH);
  }
}

/**
 * Find the AutoHotkey executable path (prioritizes v2.1-alpha)
 */
export function findAhkPath(): string | null {
  const ahkBaseDir = "C:\\Program Files\\AutoHotkey";

  // First, search for any v2.1-alpha version dynamically
  if (fs.existsSync(ahkBaseDir)) {
    try {
      const dirs = fs.readdirSync(ahkBaseDir);
      // Sort to get highest alpha version first
      const alphaDirs = dirs
        .filter((d) => d.startsWith("v2.1-alpha"))
        .sort()
        .reverse();

      for (const alphaDir of alphaDirs) {
        const exe64 = path.join(ahkBaseDir, alphaDir, "AutoHotkey64.exe");
        const exe32 = path.join(ahkBaseDir, alphaDir, "AutoHotkey32.exe");
        if (fs.existsSync(exe64)) return exe64;
        if (fs.existsSync(exe32)) return exe32;
      }
    } catch {
      // Ignore directory read errors
    }
  }

  // Fallback to static paths
  for (const ahkPath of AHK_PATHS) {
    if (fs.existsSync(ahkPath)) {
      return ahkPath;
    }
  }
  return null;
}

/**
 * Kill all running instances of the keybindings.ahk script
 */
export async function killKeybindingsScript(): Promise<void> {
  try {
    const { stdout } = await execAsync(`wmic process where "commandline like '%keybindings.ahk%'" get processid`, {
      encoding: "utf8",
    });

    const pids = stdout
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => /^\d+$/.test(line));

    for (const pid of pids) {
      try {
        await execAsync(`taskkill /PID ${pid} /F`);
      } catch {
        // Process may have already terminated
      }
    }
  } catch {
    // No processes found or error - that's okay
  }
}

/**
 * Check if keybindings script is running
 */
export async function isKeybindingsRunning(): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`wmic process where "commandline like '%keybindings.ahk%'" get processid`, {
      encoding: "utf8",
    });

    const pids = stdout
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => /^\d+$/.test(line));

    return pids.length > 0;
  } catch {
    return false;
  }
}

/**
 * Launch the keybindings.ahk script in the background
 */
export async function launchKeybindingsScript(): Promise<boolean> {
  const ahkPath = findAhkPath();

  if (!ahkPath) {
    await showToast({
      style: Toast.Style.Failure,
      title: "AutoHotkey Not Found",
      message: "Please install AutoHotkey v2",
    });
    return false;
  }

  ensureScriptsDir();

  if (!fs.existsSync(KEYBINDINGS_SCRIPT_PATH)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Script Not Found",
      message: "keybindings.ahk not found",
    });
    return false;
  }

  try {
    const child = spawn(ahkPath, [KEYBINDINGS_SCRIPT_PATH], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
    return true;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Launch Script",
      message: String(error),
    });
    return false;
  }
}

/**
 * Reload the keybindings script
 */
export async function reloadKeybindingsScript(): Promise<boolean> {
  await killKeybindingsScript();
  await new Promise((resolve) => setTimeout(resolve, 300));
  return launchKeybindingsScript();
}

/**
 * Read the current keybindings.ahk content
 */
export function readKeybindingsScript(): string {
  ensureScriptsDir();
  if (fs.existsSync(KEYBINDINGS_SCRIPT_PATH)) {
    return fs.readFileSync(KEYBINDINGS_SCRIPT_PATH, "utf8");
  }
  return "";
}

/**
 * Write the keybindings.ahk content
 */
export function writeKeybindingsScript(content: string): void {
  ensureScriptsDir();
  fs.writeFileSync(KEYBINDINGS_SCRIPT_PATH, content, "utf8");
}

/**
 * Execute a one-off AHK command
 */
export async function executeAhkCommand(ahkCode: string): Promise<boolean> {
  const ahkPath = findAhkPath();

  if (!ahkPath) {
    await showToast({
      style: Toast.Style.Failure,
      title: "AutoHotkey Not Found",
      message: "Please install AutoHotkey v2",
    });
    return false;
  }

  ensureScriptsDir();

  if (!fs.existsSync(VD_LIBRARY_PATH)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "VD.ahk Not Found",
      message: "The VD.ahk library is missing",
    });
    return false;
  }

  const tempScript = `#Requires AutoHotkey v2.1-alpha.5
#SingleInstance Force
#Include ${VD_LIBRARY_PATH.replace(/\\/g, "\\\\")}
VD.createUntil(3)
Sleep 150
try {
    ${ahkCode}
} catch as e {
    ; Silently handle errors - window may not be valid or desktop not found
}
ExitApp
`;

  const tempScriptPath = path.join(SCRIPTS_DIR, "_temp_command.ahk");

  try {
    fs.writeFileSync(tempScriptPath, tempScript, "utf8");

    execSync(`"${ahkPath}" "${tempScriptPath}"`, {
      timeout: 5000,
      windowsHide: true,
    });

    return true;
  } catch (error) {
    console.error("AHK execution error:", error);
    return false;
  } finally {
    try {
      if (fs.existsSync(tempScriptPath)) {
        fs.unlinkSync(tempScriptPath);
      }
    } catch {
      // Ignore cleanup errors
    }
  }
}
