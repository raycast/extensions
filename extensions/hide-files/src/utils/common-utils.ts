import { LocalStorage } from "@raycast/api";
import { imgExt } from "./constants";
import { DirectoryInfo, DirectoryType } from "./directory-info";
import fse from "fs-extra";

export const getLocalStorage = async (key: string) => {
  const localStorage = await LocalStorage.getItem<string>(key);
  return typeof localStorage === "undefined" ? "" : localStorage;
};

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const isImage = (ext: string) => {
  return imgExt.includes(ext);
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
    console.error(`Error checking path ${path}:`, e);
    return DirectoryType.FILE;
  }
  return DirectoryType.FILE;
};

export const checkDirectoryValid = (localDirectory: DirectoryInfo[]) => {
  return localDirectory.filter((value) => fse.existsSync(value.path));
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
    console.error(`Error reading directory ${pathName}:`, e);
    return fileSystemItems;
  }
};

export const timeStampToDateTime = (timeStamp: number) => {
  const date = new Date(timeStamp);
  return date.toLocaleString();
};
