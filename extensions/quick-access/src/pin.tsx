import { closeMainWindow, LocalStorage, showHUD, showToast, Toast } from "@raycast/api";
import { checkDuplicatePath, fetchDirectoryPath, getLocalStorage, isDirectory, isEmpty } from "./utils/common-utils";
import { DirectoryInfo, DirectoryType } from "./types/types";
import { parse } from "path";
import { LocalStorageKey } from "./utils/constants";

export default async () => {
  await closeMainWindow();
  await pinFiles();
};

export const pinFiles = async (folderPaths: string[] = [], closeMainWindow = true) => {
  try {
    const _localstorage = await getLocalStorage(LocalStorageKey.LOCAL_PIN_DIRECTORY);
    const localDirectory = isEmpty(_localstorage) ? [] : JSON.parse(_localstorage);

    const directorPath = folderPaths.length === 0 ? await fetchDirectoryPath() : folderPaths;
    const timeStamp = new Date().getTime();
    const newDirectory: DirectoryInfo[] = [];
    directorPath.forEach((value, index) => {
      const parsedPath = parse(value);
      if (!checkDuplicatePath(value, localDirectory)) {
        newDirectory.push({
          id: isDirectory(value) ? DirectoryType.FOLDER : DirectoryType.FILE + (timeStamp + index),
          name: parsedPath.base,
          path: value,
          type: isDirectory(value) ? DirectoryType.FOLDER : DirectoryType.FILE,
          valid: true,
          rank: 1,
          date: timeStamp + index,
        });
      }
    });

    await LocalStorage.setItem(
      LocalStorageKey.LOCAL_PIN_DIRECTORY,
      JSON.stringify(localDirectory.concat(newDirectory))
    );
    if (newDirectory.length === 0) {
      closeMainWindow
        ? await showHUD(`Nothing is pinned`)
        : await showToast(Toast.Style.Success, `Nothing are pinned.`);
      return;
    }
    const hudName = newDirectory[0].name + (newDirectory.length > 1 ? `, etc. are` : " is");
    closeMainWindow ? await showHUD(`${hudName} pinned`) : await showToast(Toast.Style.Success, `${hudName} pinned.`);
  } catch (e) {
    console.error(String(e));
    closeMainWindow ? await showHUD(String(e)) : await showToast(Toast.Style.Failure, String(e));
  }
};
