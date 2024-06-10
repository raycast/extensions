import { runAppleScript } from "run-applescript";
import { environment, getSelectedFinderItems } from "@raycast/api";
import fse from "fs-extra";
import { homedir } from "os";
import { buildFileName } from "../new-file-with-template";
import { imgExt } from "./constants";
import { allFileTypes, FileType, TemplateType } from "../types/file-type";
import fileUrl from "file-url";

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

export const isImage = (ext: string) => {
  return imgExt.includes(ext);
};

export const getSavedDirectory = (saveDirectory: string) => {
  let actualDirectory = saveDirectory;
  if (saveDirectory.startsWith("~")) {
    actualDirectory = saveDirectory.replace("~", `${homedir()}`);
  }
  if (isEmpty(actualDirectory) || !fse.pathExistsSync(actualDirectory)) {
    return homedir() + "/Desktop";
  }
  return actualDirectory.endsWith("/") ? actualDirectory : actualDirectory + "/";
};

export async function createNewFileWithText(
  fileExtension: string,
  saveDirectory: string,
  fileContent = "",
  fileName = "",
) {
  isEmpty(fileName)
    ? (fileName = buildFileName(saveDirectory, "Untitled", fileExtension))
    : (fileName = buildFileName(saveDirectory, fileName, fileExtension));
  const filePath = saveDirectory + fileName;
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

export function getNewFileType(fileName: string) {
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
    return undefined;
  }
}
