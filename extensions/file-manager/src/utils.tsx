import { showToast, ToastStyle, getPreferenceValues } from "@raycast/api";
import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";
import imageType from "image-type";
import { DirectoryItem, FileItem, SymlinkItem } from "./components";

export type FileType = "directory" | "file" | "symlink" | "other";

export type FileDataType = {
  type: FileType;
  name: string;
  size: number;
  permissions: string;
  path: string;
};

export type PreferencesType = {
  showDotfiles: boolean;
  directoriesFirst: boolean;
  caseSensitive: boolean;
  showFilePermissions: boolean;
  showFileSize: boolean;
  startDirectory: string;
  addExtraSlashToDirectories: boolean;
};

export function isImage(fileData: FileDataType): boolean {
  const filePath = `${fileData.path}/${fileData.name}`;
  const extension = fileData.name.split('.').pop();
  if (['gdoc', 'gsheets', 'gslides'].includes(extension)) return false;
  const type = imageType(a);
  if (type && ["png", "jpg", "ico", "webp", "gif"].includes(type.ext)) {
    return true;
  }
  return false;
}

export function getStartDirectory(): string {
  let { startDirectory } = getPreferenceValues();
  startDirectory = startDirectory.replace("~", homedir());
  return resolve(startDirectory);
}

export function createItem(fileData: FileDataType) {
  const filePath = `${fileData.path}/${fileData.name}`;
  if (fileData.type === "directory") {
    return <DirectoryItem fileData={fileData} key={filePath} />;
  } else if (fileData.type === "file") {
    return <FileItem fileData={fileData} key={filePath} />;
  } else if (fileData.type === "symlink") {
    return <SymlinkItem fileData={fileData} key={filePath} />;
  } else {
    showToast(ToastStyle.Failure, "Unsupported file type", `File type: ${fileData.type}`);
  }
}

export function getDirectoryData(path: string): FileDataType[] {
  const preferences: PreferencesType = getPreferenceValues();
  let files: string[] = readdirSync(path);
  if (!preferences.showDotfiles) {
    files = files.filter((file) => !file.startsWith("."));
  }

  // sort numerically and optionally case sensitivity
  const collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: "base",
    caseFirst: preferences.caseSensitive ? "upper" : "false",
  });
  files = files.sort(collator.compare);

  const data: FileDataType[] = [];

  for (const file of files) {
    const fileData = lstatSync(`${path}/${file}`);
    let fileName = file;
    let fileType: FileType = "other";
    if (fileData.isDirectory()) {
      fileType = "directory";
      if (preferences.addExtraSlashToDirectories) fileName = `${fileName}/`;
    } else if (fileData.isFile()) {
      fileType = "file";
    } else if (fileData.isSymbolicLink()) {
      fileType = "symlink";
    }

    // convert from number to octal
    const permissions: string = (fileData.mode & parseInt("777", 8)).toString(8);
    const size: number = fileData.size;

    const d: FileDataType = {
      type: fileType,
      name: fileName,
      size: size,
      permissions: permissions,
      path: path,
    };
    data.push(d);
  }
  return data;
}
