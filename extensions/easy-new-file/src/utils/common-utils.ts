import { runAppleScript } from "run-applescript";
import { environment, getSelectedFinderItems } from "@raycast/api";
import fse from "fs-extra";
import { homedir } from "os";
import { buildFileName } from "../new-file-here";
import { imgExt } from "./constants";
import { TemplateType } from "../types/file-type";
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
