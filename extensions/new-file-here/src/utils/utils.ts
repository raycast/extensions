import { runAppleScript } from "run-applescript";
import { getPreferenceValues, getSelectedFinderItems, showToast, Toast } from "@raycast/api";
import { Values } from "@raycast/api/types/api/app/localStorage";
import fs from "fs";

export const preferences = () => {
  const preferencesMap = new Map(Object.entries(getPreferenceValues<Values>()));
  return {
    showDocument: preferencesMap.get("show_document"),
    showCode: preferencesMap.get("show_code"),
    showScript: preferencesMap.get("show_script"),
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

export const checkDirectoryExists = async (filePath: string) => {
  try {
    fs.accessSync(filePath);
    return true;
  } catch (e) {
    return false;
  }
};

export const checkIsFile = async (path: string) => {
  try {
    const stat = fs.lstatSync(path);
    return stat.isFile();
  } catch (e) {
    await showToast(Toast.Style.Failure, String(e));
    return false;
  }
};

export const getFileInfo = (path: string) => {
  const obj1 = path.lastIndexOf("/");
  const obj2 = path.lastIndexOf(".");
  return { nameWithoutExtension: path.substring(obj1 + 1, obj2), extension: path.substring(obj2 + 1) };
};

export const getSelectedFile = async () => {
  const selectedFile: string[] = [];
  try {
    const selectedFinderItem = await getSelectedFinderItems();
    selectedFinderItem.forEach((value) => {
      const stat = fs.lstatSync(value.path);
      if (stat.isFile()) {
        selectedFile.push(value.path);
      }
    });
    return selectedFile;
  } catch (e) {
    await showToast(Toast.Style.Failure, "Fetch nothing.");
    return selectedFile;
  }
};
