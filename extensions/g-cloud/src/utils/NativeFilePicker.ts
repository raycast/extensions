import { showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { tmpdir } from "os";
import crypto from "crypto";

const execPromise = promisify(exec);
const fsWriteFile = promisify(fs.writeFile);
const fsReadFile = promisify(fs.readFile);
const fsUnlink = promisify(fs.unlink);

/**
 * Escapes a string for use in shell commands
 * Handles spaces, quotes, and other special characters
 */
function escapeShellArg(str: string): string {
  // Wrap the string in single quotes and escape any existing single quotes
  return `'${str.replace(/'/g, "'\\''")}'`;
}

// Helper function to generate temporary file paths
function getTempFilePaths() {
  const uniqueId = crypto.randomBytes(8).toString("hex");
  return {
    scriptPath: path.join(tmpdir(), `raycast-script-${uniqueId}.applescript`),
    outputPath: path.join(tmpdir(), `raycast-output-${uniqueId}.txt`),
  };
}

// Helper function to clean up temporary files
async function cleanupTempFiles(files: string[]) {
  for (const file of files) {
    try {
      await fsUnlink(file);
    } catch (error) {
      console.error(`Error cleaning up temp file ${file}:`, error);
    }
  }
}

/**
 * Escapes a string for use in AppleScript
 * Handles quotes, backslashes, and other special characters
 */
function escapeForAppleScript(str: string): string {
  return str
    .replace(/\\/g, "\\\\") // Escape backslashes first
    .replace(/"/g, '\\"') // Escape quotes
    .replace(/\r/g, "\\r") // Escape returns
    .replace(/\n/g, "\\n") // Escape newlines
    .replace(/\t/g, "\\t"); // Escape tabs
}

/**
 * Executes an AppleScript safely with proper escaping
 */
async function executeAppleScript(scriptPath: string): Promise<void> {
  const escapedPath = escapeShellArg(scriptPath);
  await execPromise(`osascript ${escapedPath}`);
}

/**
 * Parse the AppleScript output for multiple file selections
 * Handles paths that may contain commas by using a custom delimiter
 */
function parseMultipleFilePaths(output: string): string[] {
  // If empty, return empty array
  if (!output.trim()) {
    return [];
  }

  // Split on our custom delimiter and filter out any empty strings
  return output
    .split("###PATH_SEPARATOR###")
    .map((path) => path.trim())
    .filter(Boolean);
}

/**
 * Opens the native macOS file picker dialog using AppleScript
 * but in a way that preserves Raycast's state
 * @param options Configuration options for the file picker
 * @returns Promise resolving to the selected file path or null if canceled
 */
export async function openFilePicker(
  options: {
    prompt?: string;
    defaultLocation?: string;
    allowedFileTypes?: string[];
    allowMultiple?: boolean;
  } = {},
): Promise<string | string[] | null> {
  const { prompt = "Select a file", defaultLocation = "", allowedFileTypes = [], allowMultiple = false } = options;

  // Get unique temporary file paths
  const { scriptPath, outputPath } = getTempFilePaths();

  // Build the AppleScript content
  let scriptContent = `
tell application "System Events"
  activate
  set theFile to choose file with prompt "${escapeForAppleScript(prompt)}"`;

  // Add default location if provided
  if (defaultLocation) {
    scriptContent += ` default location "${escapeForAppleScript(defaultLocation)}"`;
  }

  // Add file type filtering if provided
  if (allowedFileTypes.length > 0) {
    scriptContent += ` of type {${allowedFileTypes.map((type) => `"${escapeForAppleScript(type)}"`).join(", ")}}`;
  }

  // Add multiple selection if requested
  if (allowMultiple) {
    scriptContent += ` with multiple selections allowed`;
  }

  // Complete the script to write the result to a temp file
  // For multiple selections, join paths with a custom delimiter that won't appear in file paths
  scriptContent += `
  if class of theFile is list then
    set pathList to {}
    repeat with aFile in theFile
      set end of pathList to POSIX path of aFile
    end repeat
    set filePath to (do shell script "printf '%s' '" & (pathList as text) & "'" without altering line endings)
    set filePath to my replaceText(filePath, ", ", "###PATH_SEPARATOR###")
  else
    set filePath to POSIX path of theFile
  end if
  set fileRef to open for access "${escapeForAppleScript(outputPath)}" with write permission
  write filePath to fileRef
  close access fileRef
end tell

on replaceText(theText, searchString, replacementString)
  set AppleScript's text item delimiters to searchString
  set theTextItems to every text item of theText
  set AppleScript's text item delimiters to replacementString
  set theText to theTextItems as string
  set AppleScript's text item delimiters to ""
  return theText
end replaceText

tell application "Raycast" to activate
`;

  try {
    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Opening file picker...",
    });

    // Write the script to a temporary file
    await fsWriteFile(scriptPath, scriptContent);

    // Execute the script with proper escaping
    await executeAppleScript(scriptPath);

    // Read the result from the temp output file
    let result = "";
    try {
      result = (await fsReadFile(outputPath, "utf8")).trim();
    } catch (error) {
      // If the file doesn't exist or can't be read, the user probably canceled
      loadingToast.hide();
      await cleanupTempFiles([scriptPath, outputPath]);
      return null;
    }

    // Clean up temp files
    await cleanupTempFiles([scriptPath, outputPath]);

    loadingToast.hide();

    if (!result) {
      return null;
    }

    if (allowMultiple) {
      // Parse multiple paths using our custom delimiter
      return parseMultipleFilePaths(result);
    } else {
      return result;
    }
  } catch (error: unknown) {
    console.error("Error opening file picker:", error);

    // Clean up temp files
    await cleanupTempFiles([scriptPath, outputPath]);

    showToast({
      style: Toast.Style.Failure,
      title: "Failed to open file picker",
      message: error instanceof Error ? error.message : String(error),
    });

    return null;
  }
}

/**
 * Opens the native macOS folder picker dialog using AppleScript
 * but in a way that preserves Raycast's state
 * @param options Configuration options for the folder picker
 * @returns Promise resolving to the selected folder path or null if canceled
 */
export async function openFolderPicker(
  options: {
    prompt?: string;
    defaultLocation?: string;
  } = {},
): Promise<string | null> {
  const { prompt = "Select a folder", defaultLocation = "" } = options;

  // Get unique temporary file paths
  const { scriptPath, outputPath } = getTempFilePaths();

  // Build the AppleScript content
  let scriptContent = `
tell application "System Events"
  activate
  set theFolder to choose folder with prompt "${escapeForAppleScript(prompt)}"`;

  // Add default location if provided
  if (defaultLocation) {
    scriptContent += ` default location "${escapeForAppleScript(defaultLocation)}"`;
  }

  // Complete the script to write the result to a temp file
  scriptContent += `
  set folderPath to POSIX path of theFolder
  set fileRef to open for access "${escapeForAppleScript(outputPath)}" with write permission
  write folderPath to fileRef
  close access fileRef
end tell
tell application "Raycast" to activate
`;

  try {
    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Opening folder picker...",
    });

    // Write the script to a temporary file
    await fsWriteFile(scriptPath, scriptContent);

    // Execute the script with proper escaping
    await executeAppleScript(scriptPath);

    // Read the result from the temp output file
    let result = "";
    try {
      result = (await fsReadFile(outputPath, "utf8")).trim();
    } catch (error) {
      // If the file doesn't exist or can't be read, the user probably canceled
      loadingToast.hide();
      await cleanupTempFiles([scriptPath, outputPath]);
      return null;
    }

    // Clean up temp files
    await cleanupTempFiles([scriptPath, outputPath]);

    loadingToast.hide();

    return result || null;
  } catch (error: unknown) {
    console.error("Error opening folder picker:", error);

    // Clean up temp files
    await cleanupTempFiles([scriptPath, outputPath]);

    showToast({
      style: Toast.Style.Failure,
      title: "Failed to open folder picker",
      message: error instanceof Error ? error.message : String(error),
    });

    return null;
  }
}

/**
 * Opens the native macOS save file dialog using AppleScript
 * but in a way that preserves Raycast's state
 * @param options Configuration options for the save dialog
 * @returns Promise resolving to the selected save path or null if canceled
 */
export async function openSaveDialog(
  options: {
    prompt?: string;
    defaultName?: string;
    defaultLocation?: string;
    fileType?: string;
  } = {},
): Promise<string | null> {
  const { prompt = "Save as", defaultName = "Untitled", defaultLocation = "", fileType = "" } = options;

  // Get unique temporary file paths
  const { scriptPath, outputPath } = getTempFilePaths();

  // Build the AppleScript content
  let scriptContent = `
tell application "System Events"
  activate
  set savePath to choose file name with prompt "${escapeForAppleScript(prompt)}" default name "${escapeForAppleScript(defaultName)}"`;

  // Add default location if provided
  if (defaultLocation) {
    scriptContent += ` default location "${escapeForAppleScript(defaultLocation)}"`;
  }

  // Complete the script to write the result to a temp file
  scriptContent += `
  set savePath to POSIX path of savePath
  set fileRef to open for access "${escapeForAppleScript(outputPath)}" with write permission
  write savePath to fileRef
  close access fileRef
end tell
tell application "Raycast" to activate
`;

  try {
    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Opening save dialog...",
    });

    // Write the script to a temporary file
    await fsWriteFile(scriptPath, scriptContent);

    // Execute the script with proper escaping
    await executeAppleScript(scriptPath);

    // Read the result from the temp output file
    let result = "";
    try {
      result = (await fsReadFile(outputPath, "utf8")).trim();
    } catch (error) {
      // If the file doesn't exist or can't be read, the user probably canceled
      loadingToast.hide();
      await cleanupTempFiles([scriptPath, outputPath]);
      return null;
    }

    // Clean up temp files
    await cleanupTempFiles([scriptPath, outputPath]);

    loadingToast.hide();

    if (!result) {
      return null;
    }

    // Add file extension if needed
    if (fileType && !result.endsWith(`.${fileType}`)) {
      result += `.${fileType}`;
    }

    return result;
  } catch (error: unknown) {
    console.error("Error opening save dialog:", error);

    // Clean up temp files
    await cleanupTempFiles([scriptPath, outputPath]);

    showToast({
      style: Toast.Style.Failure,
      title: "Failed to open save dialog",
      message: error instanceof Error ? error.message : String(error),
    });

    return null;
  }
}
