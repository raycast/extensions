import fse from "fs-extra";
import { getSelectedFinderItems, LocalStorage, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { DirectoryInfo, DirectoryType, LocalDirectoryKey } from "../types/directory-info";
import path from "path";
import { getFinderInsertLocation } from "./applescript-utils";

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

export async function addDirectoryMenuBar() {
  const directoryPath = await getFinderInsertLocation();
  const parsedPath = path.parse(directoryPath);

  const _localStorageOpen = await LocalStorage.getItem(LocalDirectoryKey.OPEN_COMMON_DIRECTORY);
  const _localStorageSend = await LocalStorage.getItem(LocalDirectoryKey.SEND_COMMON_DIRECTORY);
  const _OpenCommonDirectory: DirectoryInfo[] =
    typeof _localStorageOpen == "string" ? JSON.parse(_localStorageOpen) : [];
  const _SendCommonDirectory: DirectoryInfo[] =
    typeof _localStorageSend == "string" ? JSON.parse(_localStorageSend) : [];
  //check duplicate
  let duplicatePath = false;
  _OpenCommonDirectory.forEach((value) => {
    if (value.path === parsedPath.dir + "/" + parsedPath.base) {
      duplicatePath = true;
      return;
    }
  });
  if (duplicatePath) {
    await showToast(Toast.Style.Failure, "Directory already exists.");
  } else {
    const newItem = {
      id: DirectoryType.DIRECTORY + "_" + new Date().getTime(),
      alias: "",
      name: parsedPath.base,
      path: parsedPath.dir + "/" + parsedPath.base,
      valid: true,
      type: DirectoryType.DIRECTORY,
      rank: 1,
      rankSendFile: 1,
      isCommon: true,
      date: new Date().getTime(),
    };
    _OpenCommonDirectory.push(newItem);
    _SendCommonDirectory.push(newItem);
    await LocalStorage.setItem(LocalDirectoryKey.OPEN_COMMON_DIRECTORY, JSON.stringify(_OpenCommonDirectory));
    await LocalStorage.setItem(LocalDirectoryKey.SEND_COMMON_DIRECTORY, JSON.stringify(_SendCommonDirectory));
    await showHUD(`Successfully added ${parsedPath.name}`);
    await popToRoot({ clearSearchBar: false });
  }
}
