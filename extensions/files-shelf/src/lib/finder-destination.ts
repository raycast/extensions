import { getSelectedFinderItems } from "@raycast/api";
import { execFile } from "child_process";
import { promisify } from "util";
import { validateDestination } from "./file-operations";

const execFileAsync = promisify(execFile);
const blockedWindowNames = new Set(["Recents", "All My Files"]);

type DestinationResult = { path: string } | { error: string };

async function getFrontFinderWindowTarget(): Promise<
  | { name: string; path: string }
  | {
      error: string;
    }
> {
  const script = [
    'tell application "Finder"',
    '  if (count of windows) is 0 then return "ERR::No Finder window open"',
    "  set windowName to name of front window",
    "  try",
    "    set targetPath to POSIX path of (target of front window as alias)",
    "  on error errMsg",
    '    return "ERR::" & errMsg',
    "  end try",
    '  return windowName & "\\n" & targetPath',
    "end tell",
  ].join("\n");

  try {
    const { stdout } = await execFileAsync("osascript", ["-e", script]);
    const output = stdout.trim();
    if (!output) {
      return { error: "No Finder window path available" };
    }
    if (output.startsWith("ERR::")) {
      return { error: output.slice("ERR::".length).trim() || "Unable to read Finder window" };
    }
    const lines = output.split("\n");
    const name = lines[0]?.trim();
    const path = lines.slice(1).join("\n").trim();
    if (!name || !path) {
      return { error: "No Finder window path available" };
    }
    return { name, path };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to run AppleScript";
    return { error: message };
  }
}

function formatFallbackError(selectionError?: string, windowError?: string) {
  if (selectionError && windowError) {
    return `${selectionError}. You can also open a folder in the front Finder window (not Recents).`;
  }
  if (selectionError) return selectionError;
  if (windowError) return windowError;
  return "Select a folder in Finder or open a folder in the front Finder window.";
}

export async function getFinderDestination(): Promise<DestinationResult> {
  let selectionError: string | undefined;

  try {
    const finderItems = await getSelectedFinderItems();
    if (finderItems.length > 0) {
      const destPath = finderItems[0].path;
      const validation = validateDestination(destPath);
      if (validation.valid) {
        return { path: destPath };
      }
      selectionError = validation.error || "Invalid destination";
    } else {
      selectionError = "No folder selected in Finder";
    }
  } catch {
    selectionError = "Please select a folder in Finder";
  }

  const windowTarget = await getFrontFinderWindowTarget();
  if ("error" in windowTarget) {
    return { error: formatFallbackError(selectionError, windowTarget.error) };
  }

  if (blockedWindowNames.has(windowTarget.name)) {
    return { error: `Open a real folder in Finder (not ${windowTarget.name}).` };
  }

  const validation = validateDestination(windowTarget.path);
  if (!validation.valid) {
    return { error: validation.error || "Invalid destination" };
  }

  return { path: windowTarget.path };
}
