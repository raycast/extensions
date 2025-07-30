import { environment, getSelectedFinderItems, Icon, showHUD, showToast, Toast } from "@raycast/api";
import fse from "fs-extra";
import { buildFileName } from "../new-file-with-template";
import { imgExt } from "./constants";
import { allFileTypes, FileType, TemplateType } from "../types/file-type";
import fileUrl from "file-url";
import { defaultDirectory, showTips } from "../types/preferences";
import { runAppleScript } from "@raycast/utils";
import { homedir } from "os";
import path from "path";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

const getDefaultDirectory = (): string => {
  if (!isEmpty(defaultDirectory)) {
    return defaultDirectory;
  }
  return path.join(homedir(), "Desktop");
};

const scriptFinderHasWindows = `
if application "Finder" is not running then
    return "false"
end if

tell application "Finder"
    if (count of windows) > 0 then
        return "true"
    else
        return "false"
    end if
end tell
`;

export const finderHasOpenWindows = async (): Promise<boolean> => {
  try {
    const result = await runAppleScript(scriptFinderHasWindows);
    return result.trim() === "true";
  } catch (e) {
    console.error("Error checking Finder windows:", e);
    return false;
  }
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
    const finderHasWindows = await finderHasOpenWindows();
    let directory = getDefaultDirectory();
    if (finderHasWindows) {
      directory = await runAppleScript(scriptFinderPath);
    }
    return directory;
  } catch (e) {
    console.error(e);
    return getDefaultDirectory();
  }
};

export const checkIsFile = (path: string) => {
  try {
    const stat = fse.lstatSync(path);
    return stat.isFile();
  } catch (e) {
    console.error(e);
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
    console.error(e);
    return selectedFile;
  }
};

export const isImage = (ext: string) => {
  return imgExt.includes(ext);
};

export async function createNewFileWithText(
  fileExtension: string,
  saveDirectory: string,
  fileContent = "",
  fileName = "",
) {
  fileName = buildFileName(saveDirectory, fileName, fileExtension);
  const filePath = path.join(saveDirectory, fileName);
  fse.writeFileSync(filePath, fileContent);
  return { fileName: fileName, filePath: filePath };
}

export function getDetail(template: TemplateType) {
  if (isImage("." + template.extension.toLowerCase())) {
    return `<img src="${fileUrl(`${template.path}`)}" alt="${template.name}" height="190" />`;
  } else {
    return `<img src="${fileUrl(`${environment.assetsPath}/file-icon.png`)}" alt="${template.name}" height="190" />`;
  }
}

function getFileDetails(fileName: string): { baseName: string; extension: string } {
  // 查找最后一个点的索引
  const lastDotIndex = fileName.lastIndexOf(".");

  // 如果存在点，提取点之前和点之后的字符串
  if (lastDotIndex !== -1) {
    const baseName = fileName.substring(0, lastDotIndex);
    const extension = fileName.substring(lastDotIndex + 1);
    return { baseName, extension };
  }

  // 如果没有点，返回整个字符串作为baseName，extension为空字符串
  return { baseName: fileName, extension: fileName };
}

function findFileTypeByExtension(fileExt: string): FileType | undefined {
  return allFileTypes.find((fileType) => fileType.extension === fileExt);
}

export function getNewFileType(fileName: string): FileType {
  const { baseName, extension } = getFileDetails(fileName);
  const fileType = findFileTypeByExtension(extension.toLowerCase());
  if (fileType) {
    if (isEmpty(baseName)) {
      return fileType;
    }
    const newFileType = { ...fileType };
    if (baseName !== fileType.extension) {
      newFileType.name = baseName;
    }
    return newFileType;
  } else {
    return {
      name: baseName,
      extension: extension,
      languageId: extension,
      keywords: [extension],
      icon: Icon.Document,
      inputContent: false,
    };
  }
}

export const showCustomHUD = (options: Toast.Options) => {
  if (options.style && options.style === Toast.Style.Failure) {
    // failure should always show toast
    return showToast(options);
  } else if (showTips) {
    // success or animated should show HUD
    if (options.style && options.style === Toast.Style.Animated) {
      return showToast(options);
    } else {
      return showHUD(options.title);
    }
  }
};
export const showCustomToast = (options: Toast.Options) => {
  if (options.style && options.style === Toast.Style.Failure) {
    return showToast(options);
  }
  if (showTips) return showToast(options);
};
