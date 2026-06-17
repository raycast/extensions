import { isEmpty } from "./common-utils";
import fse from "fs-extra";
import fileUrl from "file-url";
import path from "path";
import { environment, LocalStorage } from "@raycast/api";

const assetPath = environment.assetsPath;

export const getDirectoryContent = (directoryPath: string) => {
  let fileContent = "";
  const parsePath = path.parse(directoryPath);
  let sizeTitle = "";
  let size = "";
  let created = "";
  let modified = "";
  let lastOpened = "";
  try {
    if (!isEmpty(directoryPath)) {
      const fileStat = fse.statSync(directoryPath);
      const files = fse.readdirSync(directoryPath);
      const isNormalFile = files.filter((value) => !value.startsWith("."));
      fileContent = `<img src="${fileUrl(assetPath + "/folder-icon.png")}" alt="${parsePath.name}" height="190" />`;
      sizeTitle = "Sub-files";
      size = isNormalFile.length + "";
      created = new Date(fileStat.birthtime).toLocaleString();
      modified = new Date(fileStat.mtime).toLocaleString();
      lastOpened = new Date(fileStat.atime).toLocaleString();
    }
  } catch (e) {
    console.error(String(e));
  }
  return {
    fileContent: fileContent,
    name: parsePath.name,
    where: parsePath.dir,
    sizeTitle: sizeTitle,
    size: size,
    created: created,
    modified: modified,
    lastOpened: lastOpened,
  };
};

export enum ShowDetailKey {
  OPEN_COMMON_DIRECTORY = "open_detail",
  SEND_COMMON_DIRECTORY = "send_detail",
}

export const getShowDetailLocalStorage = async (key: ShowDetailKey) => {
  const localStorage = await LocalStorage.getItem<boolean>(key);
  return typeof localStorage === "undefined" ? true : localStorage;
};

export const setShowDetailLocalStorage = async (key: ShowDetailKey, value: boolean) => {
  await LocalStorage.setItem(key, value);
};
