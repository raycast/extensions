import { runAppleScript } from "run-applescript";
import { getPreferenceValues, getSelectedFinderItems, LocalStorage } from "@raycast/api";
import fse from "fs-extra";
import Values = LocalStorage.Values;

export const preferences = () => {
  const preferencesMap = new Map(Object.entries(getPreferenceValues<Values>()));
  return {
    createAndOpen: preferencesMap.get("createAndOpen") as boolean,
    showDocument: preferencesMap.get("show_document") as boolean,
    showCode: preferencesMap.get("show_code") as boolean,
    showScript: preferencesMap.get("show_script") as boolean,
  };
};

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

const scriptFinderPath = `
if application "Finder" is not running then
    return "Finder not running"
end if

tell application "Finder"
    return POSIX path of ((insertion location) as alias)
end tell
`;

export const getFinderPath = async () => {
  try {
    return await runAppleScript(scriptFinderPath);
  } catch (e) {
    return "Finder not running";
  }
};

const scriptChooseFile = `
if application "Finder" is not running then
    return "Not running"
end if

return POSIX path of (choose file)
`;

export const getChooseFile = async () => {
  let finderPath = "";
  try {
    finderPath = await runAppleScript(scriptChooseFile);
    return finderPath;
  } catch (e) {
    return finderPath;
  }
};

const scriptCopyFile = (path: string) => {
  return `tell app "Finder" to set the clipboard to (POSIX file "${path}")`;
};

export const copyFileByPath = async (path: string) => {
  try {
    await runAppleScript(scriptCopyFile(path));
    return "";
  } catch (e) {
    return String(e);
  }
};

export const checkIsFile = (path: string) => {
  try {
    const stat = fse.lstatSync(path);
    return stat.isFile();
  } catch (e) {
    return false;
  }
};

export const getSelectedFile = async () => {
  const selectedFile: string[] = [];
  try {
    const selectedFinderItem = await getSelectedFinderItems();
    selectedFinderItem.forEach((value) => {
      const stat = fse.lstatSync(value.path);
      if (stat.isFile()) {
        selectedFile.push(value.path);
      }
    });
    return selectedFile;
  } catch (e) {
    return selectedFile;
  }
};

export const imgExt = [
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
];

export const isImage = (ext: string) => {
  return imgExt.includes(ext);
};
