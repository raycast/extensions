import fse from "fs-extra";
import { getSelectedFinderItems } from "@raycast/api";
import { DirectoryInfo, DirectoryType } from "../types/directory-info";
import path from "path";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const getSelectedDirectory = async () => {
  const selectedFile: string[] = [];
  try {
    const selectedFinderItem = await getSelectedFinderItems();
    selectedFinderItem.forEach((value) => {
      const stat = fse.lstatSync(value.path);
      if (stat.isDirectory()) {
        selectedFile.push(value.path);
      }
    });
    return selectedFile;
  } catch (e) {
    return selectedFile;
  }
};

export const getDirectoryName = (directoryPath: string) => {
  return path.parse(directoryPath).base;
};

export const isDirectoryOrFile = (path: string) => {
  try {
    const stat = fse.lstatSync(path);
    if (stat.isDirectory()) {
      return DirectoryType.DIRECTORY;
    }
    if (stat.isFile()) {
      return DirectoryType.FILE;
    }
  } catch (e) {
    return DirectoryType.DIRECTORY;
  }
  return DirectoryType.DIRECTORY;
};

export const checkIsFolder = (path: string) => {
  try {
    const stat = fse.lstatSync(path);
    if (stat.isDirectory()) {
      return true;
    }
  } catch (e) {
    return false;
  }
  return false;
};

export const checkDirectoryEmpty = (pathName: string) => {
  try {
    const files = fse.readdirSync(pathName);
    const isNormalFile = files.filter((value) => value.startsWith("."));
    return files.length == isNormalFile.length;
  } catch (e) {
    return false;
  }
};

export const checkDirectoryValid = (localDirectory: DirectoryInfo[]) => {
  const validDirectory: DirectoryInfo[] = [];
  localDirectory.forEach((value) => {
    if (fse.existsSync(value.path)) {
      validDirectory.push(value);
    }
  });
  return validDirectory;
};
