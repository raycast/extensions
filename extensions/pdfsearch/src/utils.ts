import { Cache } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { lstatSync, readdirSync } from "fs";
import path from "path";

export const supportedFiletypes = new Set([".pdf", ".md", ".txt"]);

// returns all POSIX filepaths in directory with supportedFiletype
export const loadDir = (dirpath: string) => {
  let validFiles: string[] = [];
  const files = readdirSync(dirpath);

  files.forEach((file) => {
    const fullPath = path.join(dirpath, file);
    if (lstatSync(fullPath).isDirectory()) {
      validFiles = validFiles.concat(loadDir(fullPath));
    } else if (supportedFiletypes.has(path.extname(file))) {
      validFiles.push(fullPath);
    }
  });

  return validFiles;
};

// load array of unique supported files from files and directories
export const getValidFiles = (files: string[]) => {
  let validFiles: string[] = [];
  files.forEach((file) => {
    if (lstatSync(file).isDirectory()) {
      validFiles = validFiles.concat(loadDir(file));
    } else if (supportedFiletypes.has(path.extname(file))) {
      validFiles.push(file);
    }
  });
  return [...new Set(validFiles)];
};

export const openFileCallback = async (page: number) => {
  const script = `
    delay 1
    tell application "System Events"
        keystroke "g" using {option down, command down}
        keystroke "${page + 1}"
        keystroke return
    end tell
    `;

  await runAppleScript(script);
};

export const cache = new Cache();
