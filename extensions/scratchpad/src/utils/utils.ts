import fse from "fs-extra";
import moment from "moment";
import { homedir } from "os";
import { getApplications, Application, open, showToast, Toast, LocalStorage } from "@raycast/api";
import { editorBundleIds } from "../constants";

export const getDefaultHomeDir = () => {
  return `${homedir()}/Desktop/Scratchpad`;
};

export const getDesktopPath = () => {
  return `${homedir()}/Desktop`;
};

export const createScratchPadFile = async (
  folderPath: string,
  filePrefix: string,
  fileType: string,
  application: string,
) => {
  try {
    await fse.ensureDir(folderPath);
  } catch (e) {
    showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: `Error creating folder at ${folderPath}`,
    });
    return;
  }
  const timeSuffix = moment().format("YYMMDDHHmmss");
  const filePath = `${folderPath}/${filePrefix}${timeSuffix}${fileType}`;
  try {
    await fse.ensureFile(filePath);
  } catch (e) {
    showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: `Error creating file at ${filePath}`,
    });
    return;
  }
  try {
    await open(filePath, application);
  } catch (e) {
    showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: `Error opening file at ${filePath}`,
    });
  }
  showToast({
    style: Toast.Style.Success,
    title: "File Created",
    message: `File created at ${filePath}`,
  });
};

export const isEmpty = (ip: string | null | undefined | string[]) => {
  if (Array.isArray(ip)) {
    return ip.length === 0;
  }
  return ip === null || ip === undefined || ip === "";
};

export const getValidApplicationsForScratchFile = async (): Promise<Application[]> => {
  const allApplications = await getApplications();
  return allApplications.filter((app) => app.bundleId !== undefined && editorBundleIds.includes(app.bundleId));
};

export const getLastUsedEditorId = async (): Promise<string | undefined> => {
  return LocalStorage.getItem("editorId");
};
export const storeLastUsedEditorId = async (editorId: string) => {
  return LocalStorage.setItem("editorId", editorId);
};

export const getLastUsedScratchpadFolder = async (): Promise<string | undefined> => {
  return LocalStorage.getItem("scratchpadFolder");
};

export const storeLastUsedScratchpadFolder = async (folderPath: string) => {
  return LocalStorage.setItem("scratchpadFolder", folderPath);
};

// Validates the existance of a folder
// param: folderPath - path to the folder
// returns: boolean
export const isFolderSelectionValid = (folderPath: string): boolean => {
  return fse.existsSync(folderPath) && fse.lstatSync(folderPath).isDirectory();
};

export const processSubmitAction = async (
  folderPath: string,
  filePrefix: string,
  fileType: string,
  application: string,
) => {
  await createScratchPadFile(folderPath, filePrefix, fileType, application);
  await storeLastUsedEditorId(application);
};
