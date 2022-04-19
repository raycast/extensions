import { isEmpty } from "./common-utils";
import fse from "fs-extra";
import fileUrl from "file-url";
import path from "path";
import { environment, LocalStorage } from "@raycast/api";

const assetPath = environment.assetsPath;
const raycastIsLightTheme = () => {
  return environment.theme == "light";
};
export const getDirectoryContent = (directoryPath: string) => {
  let detailContent = "";
  const parsePath = path.parse(directoryPath);
  const previewIcon = raycastIsLightTheme() ? "folder-icon.png" : "folder-icon@dark.png";
  try {
    if (!isEmpty(directoryPath)) {
      const fileStat = fse.statSync(directoryPath);
      const files = fse.readdirSync(directoryPath);
      const isNormalFile = files.filter((value) => !value.startsWith("."));
      detailContent = `![](${fileUrl(assetPath + "/" + previewIcon)})\n

**Name**:${parsePath.name}

**Where**: ${parsePath.dir}

**Sub-files**: ${isNormalFile.length}

**Created**: ${new Date(fileStat.birthtime).toLocaleString()}

**Modified**: ${new Date(fileStat.mtime).toLocaleString()}

**Last opened**: ${new Date(fileStat.atime).toLocaleString()}
`;
    }
  } catch (e) {
    console.error(String(e));
  }
  return detailContent;
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
