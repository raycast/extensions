/**
 * File Picker Utilities
 *
 * Provides helper functions for invoking the native macOS file picker
 * via AppleScript. These helpers are used to collect file and folder
 * paths that will be shared with ACP agents as contextual information.
 */

import { runAppleScript, Alert, confirmAlert } from "@raycast/api";

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
 * Run AppleScript and gracefully handle user cancellations.
 */
async function runPickerScript(script: string): Promise<string[]> {
  try {
    const result = await runAppleScript(script);
    return parsePaths(result);
  } catch (error) {
    if (error instanceof Error && error.message.includes("User canceled")) {
      return [];
    }
    throw error;
  }
}

/**
 * Allow the user to select one or more files.
 */
export async function pickFiles(options: FilePickerOptions = {}): Promise<string[]> {
  const prompt = escapeAppleScriptString(options.prompt ?? "Select files to share");
  const initialDirectory = options.initialDirectory
    ? escapeAppleScriptString(options.initialDirectory)
    : undefined;
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

  return runPickerScript(script);
}

/**
 * Allow the user to select one or more directories.
 */
export async function pickDirectories(options: FilePickerOptions = {}): Promise<string[]> {
  const prompt = escapeAppleScriptString(options.prompt ?? "Select directories to share");
  const initialDirectory = options.initialDirectory
    ? escapeAppleScriptString(options.initialDirectory)
    : undefined;
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

  return runPickerScript(script);
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
