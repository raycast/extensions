import { closeMainWindow, getPreferenceValues, getSelectedFinderItems, open, showHUD, showToast, Toast } from "@raycast/api";
import { execFile } from "child_process";
import { existsSync, statSync } from "fs";
import { homedir } from "os";
import { dirname } from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

function expandHome(path: string): string {
  if (path === "~") return homedir();
  if (path.startsWith("~/")) return `${homedir()}/${path.slice(2)}`;
  return path;
}

function folderFromPath(path: string): string {
  const expanded = expandHome(path.trim());
  if (!existsSync(expanded)) {
    throw new Error(`Path does not exist: ${expanded}`);
  }
  return statSync(expanded).isDirectory() ? expanded : dirname(expanded);
}

async function finderSelection(): Promise<string | undefined> {
  try {
    const items = await getSelectedFinderItems();
    if (items.length > 0) {
      return folderFromPath(items[0].path);
    }
  } catch {
    // Finder not frontmost / no selection
  }
  return undefined;
}

async function finderWindowFolder(): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync("osascript", [
      "-e",
      `tell application "Finder"
        if (count of windows) is 0 then return ""
        return POSIX path of (target of front window as alias)
      end tell`,
    ]);
    const path = stdout.trim();
    if (path) return folderFromPath(path);
  } catch {
    // ignore
  }
  return undefined;
}

async function resolveFolder(): Promise<string> {
  const fromSelection = await finderSelection();
  if (fromSelection) return fromSelection;

  const fromWindow = await finderWindowFolder();
  if (fromWindow) return fromWindow;

  throw new Error("Select a folder in Finder (or open a Finder window) first.");
}

function quoteAppleScript(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function openInWarp(folder: string, vibeBin: string): Promise<void> {
  const uri = `warp://action/new_tab?path=${encodeURIComponent(folder)}`;
  await open(uri);

  // Warp URI has no "run command" param — type vibe after the tab opens.
  await execFileAsync("osascript", [
    "-e",
    `tell application "Warp" to activate
     delay 0.55
     tell application "System Events"
       keystroke quoted form of "${quoteAppleScript(vibeBin)}"
       key code 36
     end tell`,
  ]);
}

async function openInGhostty(folder: string, vibeBin: string): Promise<void> {
  const ghostty = "/Applications/Ghostty.app/Contents/MacOS/ghostty";
  if (existsSync(ghostty)) {
    try {
      await execFileAsync(ghostty, ["+new-window", `--working-directory=${folder}`, "-e", vibeBin]);
      return;
    } catch {
      // fall through to AppleScript
    }
  }

  await open(folder, { app: { name: "Ghostty" } });
  await execFileAsync("osascript", [
    "-e",
    `tell application "Ghostty" to activate
     delay 0.45
     tell application "System Events"
       keystroke "t" using {command down}
       delay 0.2
       keystroke "cd " & quoted form of "${quoteAppleScript(folder)}" & " && " & quoted form of "${quoteAppleScript(vibeBin)}"
       key code 36
     end tell`,
  ]);
}

async function openInAppleTerminal(folder: string, vibeBin: string): Promise<void> {
  await execFileAsync("osascript", [
    "-e",
    `tell application "Terminal"
       do script "cd " & quoted form of "${quoteAppleScript(folder)}" & " && " & quoted form of "${quoteAppleScript(vibeBin)}"
       activate
     end tell`,
  ]);
}

export default async function Command() {
  const { terminal, vibePath } = getPreferenceValues<Preferences>();
  const vibeBin = expandHome(vibePath || "/opt/homebrew/bin/vibe");

  if (!existsSync(vibeBin)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "vibe not found",
      message: `Expected ${vibeBin}. Install with brew install mistral-vibe`,
    });
    return;
  }

  try {
    const folder = await resolveFolder();
    await closeMainWindow();

    if (terminal === "ghostty") {
      await openInGhostty(folder, vibeBin);
    } else if (terminal === "apple") {
      await openInAppleTerminal(folder, vibeBin);
    } else {
      await openInWarp(folder, vibeBin);
    }

    await showHUD(`Vibe → ${folder}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't open Vibe",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
