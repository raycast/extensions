import { lstatSync, readdirSync } from "fs";
import path from "path";

export const supportedFiletypes = [".pdf"];

// returns all POSIX filepaths in directory with supportedFiletype
export const loadDir = (dirpath: string) => {
  let validFiles: string[] = [];
  const files = readdirSync(dirpath);

  files.forEach((file) => {
    const fullPath = path.join(dirpath, file);
    if (lstatSync(fullPath).isDirectory()) {
      validFiles = validFiles.concat(loadDir(fullPath));
    } else if (supportedFiletypes.includes(path.extname(file))) {
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
    } else if (supportedFiletypes.includes(path.extname(file))) {
      validFiles.push(file);
    }
  });
  return [...new Set(validFiles)];
};
