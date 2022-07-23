import { getSelectedFinderItems, LocalStorage } from "@raycast/api";
import fse from "fs-extra";
import { DirectoryInfo, FileType } from "../types/types";
import { imgExt } from "./constants";
import { parse } from "path";
import { getFinderInsertLocation } from "./applescript-utils";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const getLocalStorage = async (key: string) => {
  const localStorage = await LocalStorage.getItem<string>(key);
  return typeof localStorage === "undefined" ? "" : localStorage;
};

export const fetchFileSystemItem = async () => {
  const _finderItems = await getSelectedFinderItems();
  if (_finderItems.length > 0) {
    return _finderItems;
  } else {
    return [];
  }
};

export const fetchDirectoryPath = async () => {
  const directoryPath: string[] = [];
  try {
    const selectedDirectory = await fetchFileSystemItem();
    if (selectedDirectory.length > 0) {
      selectedDirectory.forEach((value) => {
        if (isDirectory(value.path)) {
          directoryPath.push(value.path);
        }
      });
    } else {
      directoryPath.push(await getFinderInsertLocation());
    }
    return directoryPath;
  } catch (e) {
    directoryPath.push(await getFinderInsertLocation());
    return directoryPath;
  }
};

export const isDirectory = (path: string) => {
  try {
    const stat = fse.lstatSync(path);
    return stat.isDirectory();
  } catch (e) {
    console.error(String(e));
    return false;
  }
};

export const isDirectoryOrFileForFile = (path: string) => {
  try {
    const stat = fse.lstatSync(path);
    const parsedPath = parse(path);
    if (stat.isDirectory()) {
      return FileType.FOLDER;
    }
    if (stat.isFile()) {
      if (imgExt.includes(parsedPath.ext)) {
        return FileType.IMAGE;
      }
      return FileType.FILE;
    }
  } catch (e) {
    console.error(String(e));
    return FileType.FILE;
  }
  return FileType.FILE;
};

export const checkDuplicatePath = (path: string, localDirectory: DirectoryInfo[]) => {
  //check duplicate
  let duplicatePath = false;
  localDirectory.forEach((value) => {
    if (value.path === path) {
      duplicatePath = true;
      return;
    }
  });
  return duplicatePath;
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

export const isImage = (ext: string) => {
  return imgExt.includes(ext);
};

export const getDirectoryFiles = (directory: string) => {
  const filesInDirectory = getFilesInDirectory(directory);
  const timeStamp = new Date().getTime();
  return filesInDirectory
    .sort((a, b) => {
      return getModifyTime(b) - getModifyTime(a);
    })
    .map((value, index) => {
      const parsedPath = parse(value);
      return {
        id: "files_" + (timeStamp + index),
        name: parsedPath.base,
        path: parsedPath.dir + "/" + parsedPath.base,
        type: isDirectoryOrFileForFile(value),
        modifyTime: getModifyTime(value),
      };
    });
};

const getModifyTime = (path: string) => {
  try {
    const stat = fse.statSync(path);
    return stat.ctimeMs;
  } catch (e) {
    console.error(e);
    return new Date().getTime();
  }
};

/**
 *
 * @param pathName with "/"
 * @return fileSystemItems:string[]
 */
export const getFilesInDirectory = (pathName: string) => {
  const fileSystemItems: string[] = [];
  try {
    const files = fse.readdirSync(pathName);
    files.forEach((value) => {
      if (!value.startsWith(".")) {
        fileSystemItems.push(pathName + value);
      }
    });
    return fileSystemItems;
  } catch (e) {
    return fileSystemItems;
  }
};

export const getFileShowNumber = (fileShowNumber: string) => {
  switch (fileShowNumber) {
    case "1":
      return 1;
    case "3":
      return 3;
    case "5":
      return 5;
    case "10":
      return 10;
    default:
      return -1;
  }
};

export function formatBytes(sizeInBytes: number) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let unitIndex = 0;
  while (sizeInBytes >= 1024) {
    sizeInBytes /= 1024;
    unitIndex++;
  }

  return `${sizeInBytes.toFixed(1)} ${units[unitIndex]}`;
}
