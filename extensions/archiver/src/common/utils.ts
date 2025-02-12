import { Alert, confirmAlert, environment, getPreferenceValues, Icon } from "@raycast/api";
import fsSync from "node:fs/promises";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  CompressFormat,
  COMPRESS_FORMAT_METADATA,
  COMPRESS_HANDLES,
  ExtractFormat,
  EXTRACT_FORMAT_METADATA,
  EXTRACT_HANDLES,
} from "./const";
import { ICompressPreferences, IExtractPreferences } from "./types";
import { execa, execaSync } from "execa";

const _7zaBinaryAsset = path.join(environment.assetsPath, `${process.arch}_7za`);
const _7zaBinary = path.join(environment.supportPath, `${process.arch}_7za`);

export function ensureBinary() {
  if (!fs.existsSync(_7zaBinary)) {
    execaSync("cp", [_7zaBinaryAsset, _7zaBinary]);
    execaSync("chmod", ["+x", _7zaBinary]);
  }
}

export function isSupportExtractFormat(format: string): ExtractFormat | null {
  if (!format) {
    return null;
  }
  let extractFormat = null;
  EXTRACT_FORMAT_METADATA.forEach((value, key) => {
    if (value.ext.toUpperCase() === format.toUpperCase()) {
      extractFormat = key;
    }
  });
  return extractFormat;
}

export async function compress(items: string[], format: CompressFormat, password?: string): Promise<string> {
  const extractHandle = COMPRESS_HANDLES.get(format);
  if (!extractHandle) {
    return "";
  }
  return await extractHandle(items, format, password);
}

export async function compressBy7za(items: string[], format: CompressFormat, password?: string): Promise<string> {
  const preferences: ICompressPreferences = getPreferenceValues();
  const delOpt = preferences.deleteAfterCompression ? ["-sdel"] : [];
  const pwdOpt = password ? [`-p${password}`] : [];
  const { location, name } = await getCompressSaveLocationAndName(items.length === 1, items[0], format);
  const resPath = path.join(location, name);
  if (format === CompressFormat.GZIP) {
    const tempLoc = os.tmpdir();
    const tarName = name.substring(0, name.lastIndexOf("."));
    const tarPath = path.join(tempLoc, tarName);
    await execa(_7zaBinary, ["a", tarPath, ...items, ...pwdOpt, ...delOpt, "-y"]);
    await execa(_7zaBinary, ["a", resPath, tarPath, ...pwdOpt, "-sdel", "-y"]);
  } else {
    await execa(_7zaBinary, ["a", resPath, ...items, ...pwdOpt, ...delOpt, "-y"]);
  }
  return resPath;
}

async function getCompressSaveLocationAndName(
  isSingle: boolean,
  filePath: string,
  format: CompressFormat
): Promise<{ location: string; name: string }> {
  const preferences: ICompressPreferences = getPreferenceValues();
  let saveLoc = preferences.locationSaveCompressed || path.dirname(filePath);
  if (!saveLoc.endsWith("/")) {
    saveLoc += "/";
  }
  let name = "";
  if (isSingle && preferences.useOriginalNameWhenSingle) {
    name = path.basename(filePath);
  }
  if (isSingle && !preferences.useOriginalNameWhenSingle) {
    name = "Archive";
  }
  if (!isSingle && preferences.useParentFolderNameWhenMultiple) {
    name = path.basename(path.dirname(filePath));
  }
  if (!isSingle && !preferences.useParentFolderNameWhenMultiple) {
    name = "Archive";
  }
  name += COMPRESS_FORMAT_METADATA.get(format)?.ext;
  await folderExists(saveLoc);
  return { location: saveLoc, name };
}

export async function extract(file: string, format: ExtractFormat, password?: string): Promise<string> {
  const extractHandle = EXTRACT_HANDLES.get(format);
  if (!extractHandle) {
    return "";
  }
  const resLoc = await extractHandle(file, format, password);
  const preferences: IExtractPreferences = getPreferenceValues();
  preferences.deleteAfterExtraction && deleteFile(file);
  return resLoc;
}

export async function extractBy7za(file: string, format: ExtractFormat, password?: string): Promise<string> {
  const pwdOpt = password ? [`-p${password}`] : [];

  const location = await getExtractSaveLocation(file, format);
  if (format === ExtractFormat.GZIP) {
    const tempLoc = os.tmpdir();
    await execa(_7zaBinary, ["x", file, "-y", `-o${tempLoc}`, ...pwdOpt]);
    const zipName = path.basename(file);
    file = path.join(tempLoc, zipName.substring(0, zipName.lastIndexOf(".")));
    await execa(_7zaBinary, ["x", file, "-y", `-o${location}`, ...pwdOpt]);
    deleteFile(file);
  } else {
    await execa(_7zaBinary, ["x", file, "-y", `-o${location}`, ...pwdOpt]);
  }
  return location;
}

async function getExtractSaveLocation(zipPath: string, format: ExtractFormat): Promise<string> {
  const preferences: IExtractPreferences = getPreferenceValues();
  let saveLoc = preferences.locationSaveExtracted || path.dirname(zipPath);
  if (!saveLoc.endsWith("/")) {
    saveLoc += "/";
  }
  let zipName = path.basename(zipPath);
  if (format === ExtractFormat.GZIP) {
    zipName = zipName.substring(0, zipName.lastIndexOf("."));
  }
  saveLoc += zipName.substring(0, zipName.lastIndexOf("."));
  await folderExists(saveLoc);
  return saveLoc;
}

async function folderExists(folder: string): Promise<boolean> {
  try {
    const isExists = await fsSync.stat(folder);
    if (isExists.isDirectory()) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    const tempFolder = path.parse(folder).dir;
    const status = await folderExists(tempFolder);
    if (status) {
      return await mkdir(folder);
    }
    return false;
  }
}

async function mkdir(folder: string): Promise<boolean> {
  try {
    await fsSync.mkdir(folder);
    return true;
  } catch (error) {
    return false;
  }
}

function deleteFile(file: string) {
  fs.rmSync(file, { force: true, recursive: true });
}

export function isNeedPwdOnExtract(file: string, format: ExtractFormat): boolean {
  let need = false;
  if (format !== ExtractFormat["7Z"] && format !== ExtractFormat.ZIP) {
    return need;
  }
  try {
    execaSync(_7zaBinary, ["t", file]);
  } catch (error) {
    if (
      String(error).includes("ERROR: Wrong password") ||
      String(error).includes("Enter password (will not be echoed):")
    ) {
      need = true;
    }
  }
  return need;
}

export function checkPwdOnExtract(file: string, format: ExtractFormat, password: string): boolean {
  let correct = true;
  if (format !== ExtractFormat["7Z"] && format !== ExtractFormat.ZIP) {
    return correct;
  }
  try {
    execaSync(_7zaBinary, ["t", file, `-p${password}`]);
  } catch (error) {
    if (String(error).includes("Wrong password")) {
      correct = false;
    }
  }
  return correct;
}

export function processingAlert() {
  const options: Alert.Options = {
    title: "Processing, please wait a second",
    icon: { source: Icon.Repeat },
    primaryAction: {
      title: "OK",
    },
  };
  confirmAlert(options);
}

export function getFileSize(file: string): number {
  const state = fs.statSync(file);
  return state.size / 1000 / 1000;
}
