import { Alert, confirmAlert, getSelectedFinderItems, Icon, LocalStorage } from "@raycast/api";
import fse from "fs-extra";
import { DirectoryInfo, FileType, FolderPageItem } from "../types/types";
import { imgExt } from "./constants";
import { parse } from "path";
import { getFinderInsertLocation } from "./applescript-utils";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const fakeMutate = async () => {};

export const alertDialog = async (
  icon: Icon,
  title: string,
  message: string,
  confirmTitle: string,
  confirmAction: () => void,
  cancelAction?: () => void,
) => {
  const options: Alert.Options = {
    icon: icon,
    title: title,
    message: message,
    primaryAction: {
      title: confirmTitle,
      onAction: confirmAction,
    },
    dismissAction: {
      title: "Cancel",
      onAction: () => cancelAction,
    },
  };
  await confirmAlert(options);
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
        directoryPath.push(value.path);
      });
    } else {
      directoryPath.push(await getFinderInsertLocation());
    }
    return directoryPath;
  } catch (e) {
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
    return stat.mtimeMs;
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

export function formatBytes(sizeInBytes: number) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let unitIndex = 0;
  while (sizeInBytes >= 1024) {
    sizeInBytes /= 1024;
    unitIndex++;
  }

  return `${sizeInBytes.toFixed(1)} ${units[unitIndex]}`;
}

export function directory2File(directory: DirectoryInfo) {
  return {
    id: directory.id,
    name: directory.name,
    path: directory.path,
    type: FileType.FILE,
    modifyTime: directory.date,
  };
}

export function getFolderByPath(folderPath: string) {
  const files = fse.readdirSync(folderPath);
  const _folders: FolderPageItem[] = [];
  files.forEach((value) => {
    if (!value.startsWith(".")) {
      _folders.push({ name: value, isFolder: isDirectory(folderPath + "/" + value) });
    }
  });
  return _folders;
}

export function moveElement(array: DirectoryInfo[], index: number, steps: number) {
  if (index < 0 || index >= array.length || steps === 0) {
    return array;
  }
  let newIndex = index + steps;
  if (newIndex < 0) {
    newIndex = 0;
  } else if (newIndex >= array.length) {
    newIndex = array.length - 1;
  }
  const [element] = array.splice(index, 1);
  array.splice(newIndex, 0, element);
  return array;
}
