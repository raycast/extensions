import { LocalStorage } from "@raycast/api";
import { checkDuplicatePath, getLocalStorage, isDirectoryOrFile, isEmpty } from "./common-utils";
import { DirectoryInfo, LocalStorageKey } from "./directory-info";
import { parse } from "path";
import { exec } from "child_process";

export const putFileOnHidePanel = async (fileSystemItems: string[]) => {
  try {
    const _localstorage = await getLocalStorage(LocalStorageKey.LOCAL_HIDE_DIRECTORY);
    const localDirectory: DirectoryInfo[] = isEmpty(_localstorage)
      ? []
      : (JSON.parse(_localstorage) as DirectoryInfo[]);

    const timeStamp = new Date().getTime();
    fileSystemItems.forEach((value, index) => {
      const parsedPath = parse(value);
      if (!checkDuplicatePath(parsedPath.dir + "/" + parsedPath.base, localDirectory)) {
        localDirectory.push({
          id: "directory_" + (timeStamp + index),
          name: parsedPath.base,
          path: parsedPath.dir + "/" + parsedPath.base,
          type: isDirectoryOrFile(value),
          valid: true,
        });
      }
    });

    await LocalStorage.setItem(LocalStorageKey.LOCAL_HIDE_DIRECTORY, JSON.stringify(localDirectory));
  } catch (e) {
    console.error(String(e));
  }
};

/**
 *
 * @param path If there are multiple paths, please separate them with spaces
 */
export const showHiddenFiles = (path: string) => {
  const hideDesktopFilesCommand = `chflags nohidden ${path}`;
  exec(hideDesktopFilesCommand);
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
