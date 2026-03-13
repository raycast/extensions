import { captureException, getSelectedFinderItems, LocalStorage, showHUD } from "@raycast/api";
import { checkDuplicatePath, getFilesInDirectory, getLocalStorage, isDirectoryOrFile, isEmpty } from "./common-utils";
import { DirectoryInfo } from "./directory-info";
import { parse } from "path";
import { spawn } from "child_process";
import { LocalStorageKey } from "./constants";
import { spawnSync } from "node:child_process";
import fse from "fs-extra";

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

export const removeFilesFromPanel = async (directory: string) => {
  //remove files from hide panel
  const _localstorage = await getLocalStorage(LocalStorageKey.LOCAL_HIDE_DIRECTORY);
  let localDirectory: DirectoryInfo[] = [];
  if (!isEmpty(_localstorage)) {
    localDirectory = JSON.parse(_localstorage) as DirectoryInfo[];
  }

  const parseDirectoryPath = parse(directory);
  const newLocalDirectory = localDirectory.filter(
    (item) => parse(item.path).dir !== parseDirectoryPath.dir + "/" + parseDirectoryPath.base,
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

/**
 *
 * @param path If there are multiple paths, please separate them with spaces
 */
export const showHiddenFiles = (path: string) => {
  spawn("chflags", ["nohidden", path], { shell: true });
};

// Judging by the hidden attribute of the first file
export const isFileHidden = (path: string) => {
  const firstPath = Array.isArray(path) ? path[0] : path;
  const spawnRet = spawnSync("ls", ["-lOd", firstPath]);
  const flag = spawnRet.stdout.toString().split(RegExp("\\s+"))[4];
  return flag !== "-";
};

export const hasHiddenFiles = (path: string | string[]) => {
  const firstPath = Array.isArray(path) ? path[0] : path;
  const files = fse.readdirSync(firstPath).filter((value) => !value.startsWith("."));
  if (files.length === 0) {
    return undefined;
  }
  return isFileHidden(firstPath.endsWith("/") ? firstPath + files[0] : `${firstPath}/${files[0]}`);
};

export const hideFilesInFolder = async (path: string) => {
  try {
    const pathStr = path.endsWith("/") ? path : `${path}/`;
    const isHidden = hasHiddenFiles(pathStr);
    const { name } = parse(pathStr);
    if (typeof isHidden === "undefined") {
      await showHUD(`📂 No files in ${name}`);
      return undefined;
    }

    if (isHidden) {
      await showHUD(`🐵 Unhiding files in ${name}`);
      spawn("chflags", ["nohidden", `${pathStr.replaceAll(" ", `" "`)}*`], { shell: true });
      //remove files from hide panel
      await removeFilesFromPanel(pathStr);
    } else {
      await showHUD(`🙈 Hiding files in ${name}`);
      spawn("chflags", ["hidden", `${pathStr.replaceAll(" ", `" "`)}*`], { shell: true });
      //add files to hide panel
      const fileSystemItems = getFilesInDirectory(pathStr);
      await putFileOnHidePanel(fileSystemItems);
    }
    return isHidden;
  } catch (e) {
    captureException(e);
    await showHUD(`🚨 ${String(e)}`);
    console.error(String(e));
    return undefined;
  }
};

export const hideFilesSelected = async () => {
  try {
    const fileSystemItems = await getSelectedFinderItems();
    if (fileSystemItems.length === 0) {
      await showHUD("📂 No files selected");
      return;
    }
    const isHidden = isFileHidden(fileSystemItems[0].path);

    let hiddenFilesStr = "";
    fileSystemItems.forEach((value) => {
      const parsedPath = parse(value.path);
      hiddenFilesStr =
        hiddenFilesStr + " " + parsedPath.dir.replaceAll(" ", `" "`) + "/" + parsedPath.base.replaceAll(" ", `" "`);
    });

    if (isHidden) {
      await showHUD(`🐵 Unhiding selected files`);
      spawn("chflags", ["nohidden", `${hiddenFilesStr}`], { shell: true });

      //add files to hide panel
      const _fileSystemItems = fileSystemItems.map((value) => {
        return value.path;
      });
      await removeFilesFromPanelBySelected(_fileSystemItems);
    } else {
      await showHUD(`🙈 Hiding selected files`);
      spawn("chflags", ["hidden", hiddenFilesStr], { shell: true });

      //add files to hide panel
      const _fileSystemItems = fileSystemItems.map((value) => {
        return value.path;
      });
      await putFileOnHidePanel(_fileSystemItems);
    }
  } catch (e) {
    captureException(e);
    await showHUD(`🚨 ${String(e)}`);
    console.error(String(e));
  }
};

function isOverSonoma() {
  const { stdout } = spawnSync("sw_vers", ["-productVersion"], { encoding: "utf-8" });
  const macVersion = parseInt(stdout.trim().split(".")[0]);
  return macVersion >= 14;
}
export const isWidgetVisible = () => {
  if (isOverSonoma()) {
    const { stdout } = spawnSync("defaults", ["read", "com.apple.WindowManager", "StandardHideWidgets"], {
      encoding: "utf-8",
    });
    return stdout.trim() === "0";
  } else {
    return undefined;
  }
};

export enum Visibility {
  INVISIBLE = "true",
  VISIBLE = "false",
}
export const toggleWidgetsVisibility = (visibility: Visibility) => {
  try {
    if (isOverSonoma()) {
      spawnSync("defaults", ["write", "com.apple.WindowManager", "StandardHideWidgets", "-bool", visibility]);
    }
  } catch (e) {
    console.error(String(e));
  }
};
