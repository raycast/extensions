import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
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

function escapeShellArg(str: string): string {
  return `'${str.replace(/'/g, "'\\''")}'`;
}

function getTempFilePaths() {
  const uniqueId = crypto.randomBytes(8).toString("hex");
  return {
    scriptPath: path.join(tmpdir(), `raycast-script-${uniqueId}.applescript`),
    outputPath: path.join(tmpdir(), `raycast-output-${uniqueId}.txt`),
  };
}

async function cleanupTempFiles(files: string[]) {
  for (const file of files) {
    try {
      await fsUnlink(file);
    } catch (error) {
      console.error(`Error cleaning up temp file ${file}:`, error);
    }
  }
}

function escapeForAppleScript(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t");
}

async function executeAppleScript(scriptPath: string): Promise<void> {
  const escapedPath = escapeShellArg(scriptPath);
  await execPromise(`osascript ${escapedPath}`);
}

function parseMultipleFilePaths(output: string): string[] {
  if (!output.trim()) {
    return [];
  }

  return output
    .split("###PATH_SEPARATOR###")
    .map((path) => path.trim())
    .filter(Boolean);
}

export async function openFilePicker(
  options: {
    prompt?: string;
    defaultLocation?: string;
    allowedFileTypes?: string[];
    allowMultiple?: boolean;
  } = {},
): Promise<string | string[] | null> {
  const { prompt = "Select a file", defaultLocation = "", allowedFileTypes = [], allowMultiple = false } = options;

  const { scriptPath, outputPath } = getTempFilePaths();

  let scriptContent = `
tell application "System Events"
  activate
  set theFile to choose file with prompt "${escapeForAppleScript(prompt)}"`;

  if (defaultLocation) {
    scriptContent += ` default location "${escapeForAppleScript(defaultLocation)}"`;
  }

  if (allowedFileTypes.length > 0) {
    scriptContent += ` of type {${allowedFileTypes.map((type) => `"${escapeForAppleScript(type)}"`).join(", ")}}`;
  }

  if (allowMultiple) {
    scriptContent += ` with multiple selections allowed`;
  }

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

    await fsWriteFile(scriptPath, scriptContent);

    await executeAppleScript(scriptPath);

    let result = "";
    try {
      result = (await fsReadFile(outputPath, "utf8")).trim();
    } catch (error) {
      loadingToast.hide();
      await cleanupTempFiles([scriptPath, outputPath]);
      return null;
    }

    await cleanupTempFiles([scriptPath, outputPath]);

    loadingToast.hide();

    if (!result) {
      return null;
    }

    if (allowMultiple) {
      return parseMultipleFilePaths(result);
    } else {
      return result;
    }
  } catch (error: unknown) {
    console.error("Error opening file picker:", error);

    await cleanupTempFiles([scriptPath, outputPath]);

    showFailureToast({
      title: "Failed to open file picker",
      message: error instanceof Error ? error.message : String(error),
    });

    return null;
  }
}

export async function openFolderPicker(
  options: {
    prompt?: string;
    defaultLocation?: string;
  } = {},
): Promise<string | null> {
  const { prompt = "Select a folder", defaultLocation = "" } = options;

  const { scriptPath, outputPath } = getTempFilePaths();

  let scriptContent = `
tell application "System Events"
  activate
  set theFolder to choose folder with prompt "${escapeForAppleScript(prompt)}"`;

  if (defaultLocation) {
    scriptContent += ` default location "${escapeForAppleScript(defaultLocation)}"`;
  }

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

    await fsWriteFile(scriptPath, scriptContent);

    await executeAppleScript(scriptPath);

    let result = "";
    try {
      result = (await fsReadFile(outputPath, "utf8")).trim();
    } catch (error) {
      loadingToast.hide();
      await cleanupTempFiles([scriptPath, outputPath]);
      return null;
    }

    await cleanupTempFiles([scriptPath, outputPath]);

    loadingToast.hide();

    return result || null;
  } catch (error: unknown) {
    console.error("Error opening folder picker:", error);

    await cleanupTempFiles([scriptPath, outputPath]);

    showFailureToast({
      title: "Failed to open folder picker",
      message: error instanceof Error ? error.message : String(error),
    });

    return null;
  }
}

export async function openSaveDialog(
  options: {
    prompt?: string;
    defaultName?: string;
    defaultLocation?: string;
    fileType?: string;
  } = {},
): Promise<string | null> {
  const { prompt = "Save as", defaultName = "Untitled", defaultLocation = "", fileType = "" } = options;

  const { scriptPath, outputPath } = getTempFilePaths();

  let scriptContent = `
tell application "System Events"
  activate
  set savePath to choose file name with prompt "${escapeForAppleScript(prompt)}" default name "${escapeForAppleScript(defaultName)}"`;

  if (defaultLocation) {
    scriptContent += ` default location "${escapeForAppleScript(defaultLocation)}"`;
  }

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

    await fsWriteFile(scriptPath, scriptContent);

    await executeAppleScript(scriptPath);

    let result = "";
    try {
      result = (await fsReadFile(outputPath, "utf8")).trim();
    } catch (error) {
      loadingToast.hide();
      await cleanupTempFiles([scriptPath, outputPath]);
      return null;
    }

    await cleanupTempFiles([scriptPath, outputPath]);

    loadingToast.hide();

    if (!result) {
      return null;
    }

    if (fileType && !result.endsWith(`.${fileType}`)) {
      result += `.${fileType}`;
    }

    return result;
  } catch (error: unknown) {
    console.error("Error opening save dialog:", error);

    await cleanupTempFiles([scriptPath, outputPath]);

    showFailureToast({
      title: "Failed to open save dialog",
      message: error instanceof Error ? error.message : String(error),
    });

    return null;
  }
}
