import path from "path";
import { open, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

export async function open_Url_InChrome(_url_: string, _app_: string = "com.google.Chrome") {
  await open(_url_, _app_);
}

export async function open_Folder_InVSCode(_path_: string) {
  try {
    await execPromise(`code --new-window "${_path_}"`);
    await showToast({ title: "Opened folder" });
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open folder",
    });
  }
}

export async function open_Folder_InFinder(_path_: string) {
  try {
    await execPromise(`open "${_path_}"`);
    await showToast({ title: "Opened site folder" });
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open site folder",
    });
  }
}

export async function open_File_InVSCode(_file_path_: string, _folder_path_: string) {
  try {
    await execPromise(`code --new-window "${_folder_path_}"`);
    await execPromise(`code --reuse-window --goto "${_file_path_}"`);
    await showToast({ title: "Opened file" });
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open file",
    });
  }
}

export function get_FolderPaths(filePath: string): string[] {
  // Normalize the filePath to handle different OS path separators uniformly
  const normalizedPath = filePath.replace(/\\/g, "/");
  // Split the path into parts by the directory separator
  const parts = normalizedPath.split("/");
  // Remove the last part which is a file name
  parts.pop();

  const folders: string[] = [];
  // Reconstruct each partial path into a full path incrementally
  let currentPath = "";

  for (const part of parts) {
    if (currentPath.length === 0) {
      currentPath = part; // This handles starting slash issue in Unix-like paths
    } else {
      currentPath = path.join(currentPath, part);
    }
    folders.push(currentPath);
  }
  return folders;
}
