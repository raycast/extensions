import { getPreferenceValues, getSelectedFinderItems, LocalStorage } from "@raycast/api";
import fse from "fs-extra";
import { DirectoryInfo, DirectoryType } from "./directory-info";
import { imgExt } from "./constants";
import { parse } from "path";
import Values = LocalStorage.Values;
import { getFinderInsertLocation } from "./applescript-utils";

export const commonPreferences = () => {
  const preferencesMap = new Map(Object.entries(getPreferenceValues<Values>()));
  return {
    autoCopyLatestFile: preferencesMap.get("autoCopyLatestFile") as boolean,
    fileShowNumber: preferencesMap.get("fileShowNumber") as string,
    sortBy: preferencesMap.get("sortBy") as string,
  };
};

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
        const parsedPath = parse(value.path);
        if (isDirectory(value.path)) {
          directoryPath.push(parsedPath.dir + "/" + parsedPath.base);
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
    console.error(String(e));
    return DirectoryType.FILE;
  }
  return DirectoryType.FILE;
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
  localDirectory.forEach((value, index) => {
    if (!fse.existsSync(value.path)) {
      console.debug(value.name);
      localDirectory.splice(index, 1);
    }
  });
  return localDirectory;
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
        type: isDirectoryOrFile(value),
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
    case "8":
      return 8;
    case "10":
      return 10;
    default:
      return -1;
  }
};
