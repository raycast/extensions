import { FileSystemItem, LocalStorage, showHUD } from "@raycast/api";
import {
  checkDuplicatePath,
  fetchSelectedFileSystemItem,
  getLocalStorage,
  isDirectoryOrFile,
  isEmpty,
} from "./common-utils";
import { DirectoryInfo } from "./directory-info";
import { parse } from "path";
import { spawn } from "child_process";
import { LocalStorageKey } from "./constants";

export const putFileOnHidePanel = async (fileSystemItems: string[]) => {
  try {
    const _localstorage = await getLocalStorage(LocalStorageKey.LOCAL_HIDE_DIRECTORY);
    const localDirectory: DirectoryInfo[] = isEmpty(_localstorage)
      ? []
      : (JSON.parse(_localstorage) as DirectoryInfo[]);

    const timeStamp = new Date().getTime();
    const directoryInfos: DirectoryInfo[] = [];
    fileSystemItems
      .sort((a, b) => a.localeCompare(b))
      .map((value, index) => {
        const parsedPath = parse(value);
        if (!checkDuplicatePath(parsedPath.dir + "/" + parsedPath.base, localDirectory)) {
          directoryInfos.push({
            id: "directory_" + (timeStamp + index),
            name: parsedPath.base,
            path: parsedPath.dir + "/" + parsedPath.base,
            type: isDirectoryOrFile(value),
            valid: true,
            date: timeStamp + index,
          });
        }
      });

    const newLocalDirectory = [...directoryInfos, ...localDirectory].sort((a, b) => b.date - a.date);
    await LocalStorage.setItem(LocalStorageKey.LOCAL_HIDE_DIRECTORY, JSON.stringify(newLocalDirectory));
  } catch (e) {
    console.error(String(e));
  }
};

/**
 *
 * @param path If there are multiple paths, please separate them with spaces
 */
export const showHiddenFiles = (path: string) => {
  spawn("chflags", ["nohidden", path], { shell: true });
};

export const getSelectedHiddenFiles = async () => {
  let hiddenFiles = "";
  let fileSystemItems: FileSystemItem[] = [];
  try {
    fileSystemItems = await fetchSelectedFileSystemItem();
    if (fileSystemItems.length === 0) {
      await showHUD("No files selected");
      return { fileSystemItems: fileSystemItems, hiddenFiles: hiddenFiles };
    }
    fileSystemItems.forEach((value) => {
      const parsedPath = parse(value.path);
      hiddenFiles =
        hiddenFiles + " " + parsedPath.dir.replaceAll(" ", `" "`) + "/" + parsedPath.base.replaceAll(" ", `" "`);
    });
    return { fileSystemItems: fileSystemItems, hiddenFiles: hiddenFiles };
  } catch (e) {
    console.error(String(e));
    await showHUD(String(e));
    return { fileSystemItems: fileSystemItems, hiddenFiles: hiddenFiles };
  }
};

export const removeFilesFromPanel = async (directory: string) => {
  //remove files from hide panel
  const _localstorage = await getLocalStorage(LocalStorageKey.LOCAL_HIDE_DIRECTORY);
  let localDirectory: DirectoryInfo[] = [];
  if (!isEmpty(_localstorage)) {
    localDirectory = JSON.parse(_localstorage) as DirectoryInfo[];
  }

  const parseDirectoryPath = parse(directory);
  const newLocalDirectory = localDirectory.filter(
    (item) => parse(item.path).dir !== parseDirectoryPath.dir + "/" + parseDirectoryPath.base
  );
  await LocalStorage.setItem(LocalStorageKey.LOCAL_HIDE_DIRECTORY, JSON.stringify(newLocalDirectory));
};

export const removeFilesFromPanelBySelected = async (directory: string[]) => {
  //remove files from hide panel
  const _localstorage = await getLocalStorage(LocalStorageKey.LOCAL_HIDE_DIRECTORY);
  let localDirectory: DirectoryInfo[] = [];
  if (!isEmpty(_localstorage)) {
    localDirectory = JSON.parse(_localstorage) as DirectoryInfo[];
  }
  const newLocalDirectory: DirectoryInfo[] = [...localDirectory];
  directory.forEach((value1) => {
    const parseDirectoryPath = parse(value1);
    newLocalDirectory.forEach((value2, index) => {
      if (value2.path === parseDirectoryPath.dir + "/" + parseDirectoryPath.base) {
        newLocalDirectory.splice(index, 1);
      }
    });
  });
  await LocalStorage.setItem(LocalStorageKey.LOCAL_HIDE_DIRECTORY, JSON.stringify(newLocalDirectory));
};
