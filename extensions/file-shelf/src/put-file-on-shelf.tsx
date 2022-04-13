import { FileSystemItem, LocalStorage, showHUD, showToast, Toast } from "@raycast/api";
import {
  checkDuplicatePath,
  fetchFileSystemItem,
  getLocalStorage,
  isDirectoryOrFile,
  isEmpty,
  raycastIsVisible,
} from "./utils/common-utils";
import { DirectoryInfo, LocalStorageKey } from "./utils/directory-info";
import { parse } from "path";

export default async () => {
  const _raycastIsVisible = await raycastIsVisible();
  await putFileOnShelf(_raycastIsVisible);
};

export const putFileOnShelf = async (raycastIsVisible: boolean) => {
  try {
    const _localstorage = await getLocalStorage(LocalStorageKey.LOCAL_DIRECTORY);
    let localDirectory: DirectoryInfo[] = [];
    if (!isEmpty(_localstorage)) {
      localDirectory = JSON.parse(_localstorage) as DirectoryInfo[];
    }

    const timeStamp = new Date().getTime();
    const fileSystemItems: FileSystemItem[] = await fetchFileSystemItem();
    let items = 0;
    fileSystemItems.forEach((value, index) => {
      const parsedPath = parse(value.path);
      if (!checkDuplicatePath(parsedPath.dir + "/" + parsedPath.base, localDirectory)) {
        items++;
        localDirectory.push({
          id: "directory_" + (timeStamp + index),
          name: parsedPath.base,
          path: parsedPath.dir + "/" + parsedPath.base,
          type: isDirectoryOrFile(value.path),
          valid: true,
          rank: 1,
        });
      }
    });

    await LocalStorage.setItem("localDirectory", JSON.stringify(localDirectory));
    raycastIsVisible
      ? await showToast(Toast.Style.Success, "Success!", `${items} items were put on shelf.`)
      : await showHUD(`${items} items were put on shelf`);
  } catch (e) {
    raycastIsVisible ? await showToast(Toast.Style.Failure, "Error.", String(e) + ".") : await showHUD(String(e));
  }
};
