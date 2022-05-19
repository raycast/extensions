import { LocalStorage, showHUD, showToast, Toast } from "@raycast/api";
import { checkDuplicatePath, fetchDirectoryPath, getLocalStorage, isDirectory, isEmpty } from "./utils/common-utils";
import { DirectoryInfo, DirectoryType } from "./types/types";
import { parse } from "path";
import { LocalStorageKey } from "./utils/constants";

export default async () => {
  await pinDirectory();
};

export const pinDirectory = async (closeMainWindow = true) => {
  try {
    const _localstorage = await getLocalStorage(LocalStorageKey.LOCAL_PIN_DIRECTORY);
    const localDirectory = isEmpty(_localstorage) ? [] : JSON.parse(_localstorage);

    const directorPath = await fetchDirectoryPath();
    const timeStamp = new Date().getTime();
    const newDirectory: DirectoryInfo[] = [];
    directorPath.forEach((value, index) => {
      const parsedPath = parse(value);
      if (!checkDuplicatePath(value, localDirectory) && isDirectory(value)) {
        newDirectory.push({
          id: "directory_" + (timeStamp + index),
          name: parsedPath.base,
          path: value,
          type: DirectoryType.DIRECTORY,
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
        ? await showHUD(`No directories are pinned`)
        : await showToast(Toast.Style.Success, `No directories are pinned.`);
      return;
    }
    const hudName = newDirectory[0].name + (newDirectory.length > 1 ? `, etc. are` : " is");
    closeMainWindow ? await showHUD(`${hudName} pinned`) : await showToast(Toast.Style.Success, `${hudName} pinned.`);
  } catch (e) {
    console.error(String(e));
    closeMainWindow ? await showHUD(String(e)) : await showToast(Toast.Style.Failure, String(e));
  }
};
