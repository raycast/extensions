/**
 * File Picker Utilities
 *
 * Provides helper functions for invoking the native macOS file picker
 * via AppleScript. These helpers are used to collect file and folder
 * paths that will be shared with ACP agents as contextual information.
 */

import { Alert, confirmAlert } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import * as os from "os";

const execAsync = promisify(exec);
const platform = os.platform();

interface BasePickerOptions {
  /**
   * Prompt shown in the native picker dialog.
   */
  prompt?: string;
  /**
   * Directory shown when the picker opens.
   */
  initialDirectory?: string;
}

export interface FilePickerOptions extends BasePickerOptions {
  /**
   * Whether multiple selections are allowed. Defaults to false.
   */
  allowMultiple?: boolean;
}

/**
 * Escape a string so it can be safely interpolated into an AppleScript literal.
 */
function escapeAppleScriptString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Convert a newline-delimited AppleScript response into a string array.
 */
function parsePaths(result: string): string[] {
  if (!result) {
    return [];
  }
  return result
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Run platform-specific picker script and gracefully handle user cancellations.
 */
async function runPickerScript(script: string, isWindows = false): Promise<string[]> {
  try {
    let command: string;

    if (isWindows) {
      // Use PowerShell on Windows
      command = `powershell -Command "${script.replace(/"/g, '`"')}"`;
    } else {
      // Use AppleScript on macOS/Linux
      command = `osascript -e '${script.replace(/'/g, "'\\''")}'`;
    }

    const { stdout } = await execAsync(command);
    return parsePaths(stdout);
  } catch (error) {
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      // Handle both English and Japanese cancellation messages, and Windows cancellation
      if (
        errorMessage.includes("user canceled") ||
        errorMessage.includes("user cancelled") ||
        errorMessage.includes("キャンセル") ||
        errorMessage.includes("-128") ||
        errorMessage.includes("cancelled by the user")
      ) {
        return [];
      }
    }
    throw error;
  }
}

/**
 * Allow the user to select one or more files.
 */
export async function pickFiles(options: FilePickerOptions = {}): Promise<string[]> {
  if (platform === "win32") {
    return pickFilesWindows(options);
  }
  return pickFilesMacOS(options);
}

/**
 * macOS file picker using AppleScript
 */
async function pickFilesMacOS(options: FilePickerOptions = {}): Promise<string[]> {
  const prompt = escapeAppleScriptString(options.prompt ?? "Select files to share");
  const initialDirectory = options.initialDirectory ? escapeAppleScriptString(options.initialDirectory) : undefined;
  const allowMultiple = Boolean(options.allowMultiple);

  const defaultLocationClause = initialDirectory ? ` default location POSIX file "${initialDirectory}"` : "";

  const script = `
set promptText to "${prompt}"
${allowMultiple ? "set allowMultiple to true" : "set allowMultiple to false"}

if allowMultiple then
  set chosenItems to choose file with prompt promptText${defaultLocationClause} with multiple selections allowed
else
  set chosenItem to choose file with prompt promptText${defaultLocationClause}
  set chosenItems to {chosenItem}
end if

set posixPaths to {}
repeat with itemRef in chosenItems
  set end of posixPaths to POSIX path of itemRef
end repeat

set AppleScript's text item delimiters to "\\n"
return posixPaths as string
`;

  return runPickerScript(script, false);
}

/**
 * Windows file picker using PowerShell
 */
async function pickFilesWindows(options: FilePickerOptions = {}): Promise<string[]> {
  const allowMultiple = Boolean(options.allowMultiple);
  const initialDirectory = options.initialDirectory || "";

  const script = `
Add-Type -AssemblyName System.Windows.Forms;
$dialog = New-Object System.Windows.Forms.OpenFileDialog;
$dialog.Title = '${options.prompt ?? "Select files to share"}';
${initialDirectory ? `$dialog.InitialDirectory = '${initialDirectory}';` : ""}
$dialog.Multiselect = $${allowMultiple};
$result = $dialog.ShowDialog();
if ($result -eq 'OK') {
  $dialog.FileNames | ForEach-Object { Write-Output $_ }
}
`;

  return runPickerScript(script, true);
}

/**
 * Allow the user to select one or more directories.
 */
export async function pickDirectories(options: FilePickerOptions = {}): Promise<string[]> {
  if (platform === "win32") {
    return pickDirectoriesWindows(options);
  }
  return pickDirectoriesMacOS(options);
}

/**
 * macOS directory picker using AppleScript
 */
async function pickDirectoriesMacOS(options: FilePickerOptions = {}): Promise<string[]> {
  const prompt = escapeAppleScriptString(options.prompt ?? "Select directories to share");
  const initialDirectory = options.initialDirectory ? escapeAppleScriptString(options.initialDirectory) : undefined;
  const allowMultiple = Boolean(options.allowMultiple);

  const defaultLocationClause = initialDirectory ? ` default location POSIX file "${initialDirectory}"` : "";

  const script = `
set promptText to "${prompt}"
${allowMultiple ? "set allowMultiple to true" : "set allowMultiple to false"}

if allowMultiple then
  set chosenItems to choose folder with prompt promptText${defaultLocationClause} with multiple selections allowed
else
  set chosenItem to choose folder with prompt promptText${defaultLocationClause}
  set chosenItems to {chosenItem}
end if

set posixPaths to {}
repeat with itemRef in chosenItems
  set end of posixPaths to POSIX path of itemRef
end repeat

set AppleScript's text item delimiters to "\\n"
return posixPaths as string
`;

  return runPickerScript(script, false);
}

/**
 * Windows directory picker using PowerShell
 */
async function pickDirectoriesWindows(options: FilePickerOptions = {}): Promise<string[]> {
  const allowMultiple = Boolean(options.allowMultiple);
  const initialDirectory = options.initialDirectory || "";

  // Windows folder picker - note: native Windows folder browser doesn't support multi-select easily
  // For multi-select, we'd need a more complex solution
  const script = `
Add-Type -AssemblyName System.Windows.Forms;
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog;
$dialog.Description = '${options.prompt ?? "Select directory to share"}';
${initialDirectory ? `$dialog.SelectedPath = '${initialDirectory}';` : ""}
$result = $dialog.ShowDialog();
if ($result -eq 'OK') {
  Write-Output $dialog.SelectedPath
}
`;

  const result = await runPickerScript(script, true);

  // For multi-select on Windows, we would need to show the dialog multiple times
  // or use a custom WPF dialog. For now, single selection on Windows.
  if (allowMultiple && result.length > 0) {
    // Could prompt user to select multiple directories one at a time
    // but for simplicity, return single selection
  }

  return result;
}

/**
 * Prompt the user to confirm access to a given directory. Returns true if granted.
 */
export async function requestDirectoryPermission(directoryPath: string): Promise<boolean> {
  const confirmed = await confirmAlert({
    title: "Allow Directory Access?",
    message: `The path:\n${directoryPath}\nwill be shared with the agent. Continue?`,
    primaryAction: {
      title: "Allow",
      style: Alert.ActionStyle.Default,
    },
    dismissAction: {
      title: "Cancel",
      style: Alert.ActionStyle.Cancel,
    },
  });

  return confirmed;
}
