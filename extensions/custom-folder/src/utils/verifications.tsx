import fs from "fs";
import path from "path";

export function isNonEmptyFile(pathname: string) {
  return fs.existsSync(pathname) && fs.lstatSync(pathname).isFile();
}

export function isPngFile(pathname: string) {
  return path.extname(pathname).toLowerCase() === ".png";
}

export function isNonEmptyDirectory(pathname: string) {
  return fs.existsSync(pathname) && fs.lstatSync(pathname).isDirectory();
}

export const checkPathExists = (path: string): boolean => {
  try {
    fs.accessSync(path, fs.constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
};

export const checkPathIsDirectory = (path: string): boolean => {
  try {
    const stats = fs.statSync(path);
    return stats.isDirectory();
  } catch (error) {
    console.error("Error trying to verify the target path :", error);
    return false;
  }
};

export const sanitizePngFilePath = (filePath: string): string => {
  const extension = ".png";
  const pathParts = filePath.split("/");
  const fileName = pathParts.pop() || "";
  const cleanedFileName = fileName.replace(/\.[^.]+$/, "");
  const cleanedFileNameWithExtension = cleanedFileName.replace(/ /g, "_").replace(/[^a-zA-Z0-9_-]/g, "") + extension;
  pathParts.push(cleanedFileNameWithExtension);
  return pathParts.join("/");
};

export const sanitizeDirectoryPath = (directoryPath: string): string => {
  return directoryPath.replace(/[^a-zA-Z0-9/_ -]/g, "");
};
