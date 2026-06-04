import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import { runPowerShellScript } from "@raycast/utils";
import { isMac } from "./platform";

const execFileAsync = promisify(execFile);

const ACCESSIBILITY_SETTINGS_PATH = "System Settings > Privacy & Security > Accessibility";
const ACCESSIBILITY_ERROR_PREFIX = "Raycast needs Accessibility permission to trigger Blip via Finder Services.";
const SERVICES_SETTINGS_PATH = "System Settings > Keyboard > Keyboard Shortcuts > Services";
const BLIP_SERVICE_NOT_FOUND_MESSAGE = `Blip's Finder service was not found. Make sure Blip is installed and enabled in ${SERVICES_SETTINGS_PATH}.`;
const BLIP_SERVICE_DISABLED_MESSAGE = `Blip's Finder service is disabled for the selected item. Select the file in Finder and make sure Blip is enabled in ${SERVICES_SETTINGS_PATH}.`;

export async function sendPathToBlip(path: string) {
  if (!path) {
    throw new Error("Choose a file or folder first.");
  }

  if (!existsSync(path)) {
    throw new Error(`Path does not exist: ${path}`);
  }

  if (isMac) {
    await sendPathToBlipMac(path);
  } else {
    await sendPathToBlipWindows(path);
  }
}

async function sendPathToBlipMac(path: string) {
  const script = buildBlipFinderServiceScript(path);

  try {
    await execFileAsync(
      "/usr/bin/osascript",
      script.flatMap((line) => ["-e", line]),
    );
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown AppleScript failure.";
    throw new Error(buildAppleScriptError(details));
  }
}

async function sendPathToBlipWindows(path: string) {
  // Invoke the "Blip" context menu verb via PowerShell Shell.Application COM automation.
  // This mirrors the macOS Services approach: find the registered Blip shell verb and execute it.
  const escapedPath = path.replace(/'/g, "''");
  const script = `
try {
  $filePath = '${escapedPath}'
  $folder = Split-Path $filePath -Parent
  $file = Split-Path $filePath -Leaf
  $shell = New-Object -ComObject Shell.Application
  $shellFolder = $shell.NameSpace($folder)
  if ($null -eq $shellFolder) { throw 'folder_not_found' }
  $shellFile = $shellFolder.ParseName($file)
  if ($null -eq $shellFile) { throw 'file_not_found' }
  $blipVerb = @($shellFile.Verbs() | Where-Object { $_.Name -match 'Blip' })
  if ($blipVerb.Count -eq 0) { throw 'blip_not_found' }
  $blipVerb[0].DoIt()
} catch {
  Write-Error $_.Exception.Message
  exit 1
}`;

  try {
    await runPowerShellScript(script);
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error.";
    throw new Error(buildWindowsError(details));
  }
}

function buildWindowsError(details: string): string {
  const normalized = details.toLowerCase();

  if (normalized.includes("blip_not_found")) {
    return "Blip's Windows context menu was not found. Make sure Blip is installed and its shell extension is enabled.";
  }

  if (normalized.includes("folder_not_found") || normalized.includes("file_not_found")) {
    return "Could not access the selected file. Make sure it exists and you have permission to read it.";
  }

  return `Blip could not be triggered. ${details}`;
}

function buildBlipFinderServiceScript(path: string) {
  return [
    "on isBlipServiceName(menuItemName)",
    "  if menuItemName is missing value then return false",
    "  set normalizedName to menuItemName as text",
    '  return normalizedName is "Blip…" or normalizedName is "Blip..."',
    "end isBlipServiceName",
    "",
    "on clickBlipService()",
    '  tell application "System Events"',
    '    tell process "Finder"',
    "      set frontmost to true",
    '      set finderMenu to menu 1 of menu bar item "Finder" of menu bar 1',
    "      repeat with topLevelItem in menu items of finderMenu",
    "        set nestedMenu to missing value",
    "        try",
    "          set nestedMenu to menu 1 of topLevelItem",
    "        end try",
    "        if nestedMenu is not missing value then",
    "          repeat with serviceItem in menu items of nestedMenu",
    "            set serviceName to name of serviceItem",
    "            if my isBlipServiceName(serviceName) then",
    "              if enabled of serviceItem is false then",
    '                return "disabled"',
    "              end if",
    "              click serviceItem",
    '              return "clicked"',
    "            end if",
    "          end repeat",
    "        end if",
    "      end repeat",
    "    end tell",
    "  end tell",
    '  return "missing"',
    "end clickBlipService",
    "",
    'tell application "Finder"',
    "  activate",
    `  reveal POSIX file ${quoted(path)}`,
    `  select POSIX file ${quoted(path)}`,
    "end tell",
    "delay 0.2",
    "set sawDisabledService to false",
    "repeat 5 times",
    "  set serviceState to my clickBlipService()",
    '  if serviceState is "clicked" then return "clicked"',
    '  if serviceState is "disabled" then set sawDisabledService to true',
    "  if sawDisabledService then exit repeat",
    "end repeat",
    `if sawDisabledService then error ${quoted(BLIP_SERVICE_DISABLED_MESSAGE)}`,
    `error ${quoted(BLIP_SERVICE_NOT_FOUND_MESSAGE)}`,
  ];
}

function quoted(value: string) {
  return JSON.stringify(value);
}

function buildAppleScriptError(details: string) {
  const normalizedDetails = details.toLowerCase();

  if (
    normalizedDetails.includes("not allowed assistive access") ||
    normalizedDetails.includes("not authorised to send keystrokes") ||
    normalizedDetails.includes("not authorized to send apple events") ||
    normalizedDetails.includes("-1743")
  ) {
    return `${ACCESSIBILITY_ERROR_PREFIX} Enable Raycast in ${ACCESSIBILITY_SETTINGS_PATH}.`;
  }

  if (normalizedDetails.includes(BLIP_SERVICE_DISABLED_MESSAGE.toLowerCase())) {
    return BLIP_SERVICE_DISABLED_MESSAGE;
  }

  if (normalizedDetails.includes(BLIP_SERVICE_NOT_FOUND_MESSAGE.toLowerCase())) {
    return BLIP_SERVICE_NOT_FOUND_MESSAGE;
  }

  if (
    normalizedDetails.includes("menu item") &&
    normalizedDetails.includes("blip") &&
    normalizedDetails.includes("not found")
  ) {
    return BLIP_SERVICE_NOT_FOUND_MESSAGE;
  }

  return `Blip could not be triggered from Finder Services. ${details}`;
}
