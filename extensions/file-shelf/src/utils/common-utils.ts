import { runAppleScript } from "run-applescript";
import { getPreferenceValues, getSelectedFinderItems, LocalStorage } from "@raycast/api";
import Values = LocalStorage.Values;
import fse from "fs-extra";
import { DirectoryInfo, DirectoryType } from "./directory-info";

export const preferences = () => {
  const preferencesMap = new Map(Object.entries(getPreferenceValues<Values>()));
  return {
    copyAndClose: preferencesMap.get("copyAndClose") as boolean,
    folderFirst: preferencesMap.get("folderFirst") as boolean,
  };
};

export const getLocalStorage = async (key: string) => {
  const localStorage = await LocalStorage.getItem<string>(key);
  return typeof localStorage === "undefined" ? "" : localStorage;
};

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

const scriptCopyFile = (path: string) => {
  return `
tell application "Finder" to set theItems to "${path}"
set the clipboard to (POSIX file (POSIX path of (theItems as string)))
`;
};

export const copyFileByPath = async (path: string) => {
  try {
    await runAppleScript(scriptCopyFile(path));
    return "";
  } catch (e) {
    return String(e);
  }
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
    return DirectoryType.FILE;
  }
  return DirectoryType.FILE;
};

export const fetchFileSystemItem = async () => {
  const _finderItems = await getSelectedFinderItems();
  if (_finderItems.length > 0) {
    return _finderItems;
  } else {
    return [];
  }
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

export const checkDirectoryValid = (localDirectory: DirectoryInfo[]) => {
  localDirectory.forEach((value, index) => {
    if (!fse.existsSync(value.path)) {
      console.debug(value.name);
      localDirectory.splice(index, 1);
    }
  });
  return localDirectory;
};

export const isImage = (ext: string) => {
  return [
    ".cr2",
    ".cr3",
    ".gif",
    ".gif",
    ".heic",
    ".heif",
    ".icns",
    ".icon",
    ".icons",
    ".jpeg",
    ".jpg",
    ".jpg",
    ".png",
    ".raf",
    ".raw",
    ".svg",
    ".tiff",
    ".webp",
  ].includes(ext);
};

export async function raycastIsVisible() {
  const script = `
tell application "System Events"
    tell process "Raycast"
        set b to size of back window  
    end tell
end tell`;
  try {
    await runAppleScript(script);
    return true;
  } catch (e) {
    return false;
  }
}
