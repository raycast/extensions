import { Clipboard, open, showToast, Toast, trash } from "@raycast/api";
import { Dispatch, SetStateAction } from "react";

import copyUrlToClipboard from "../helpers/copy-url-to-clipboard";
import openObsidianFileOrig, { createObsidianUri } from "../helpers/open-obsidian-file";
import saveToObsidian from "../helpers/save-to-obsidian";
import { File } from "../types";

export async function openObsidianFile(file: File) {
  return openObsidianFileOrig(file.fileName);
}

export async function openUrl(file: File) {
  return open(file.attributes.source);
}

export async function copyUrl(file: File) {
  return copyUrlToClipboard(file.attributes.source, file.attributes.title);
}

export async function copyUrlAsMarkdown(file: File) {
  const safeTitle = file.attributes.title.replace(/[[\]]/g, "");
  return Clipboard.copy(`[${safeTitle}](${file.attributes.source})`);
}

export async function copyObsidianUri(file: File) {
  const url = createObsidianUri(file.fileName);
  return copyUrlToClipboard(url, file.attributes.title);
}

export async function copyObsidianUriAsMarkdown(file: File) {
  const url = createObsidianUri(file.fileName);
  const safeTitle = file.attributes.title.replace(/[[\]]/g, "");
  return Clipboard.copy(`[${safeTitle}](${url})`);
}

export async function deleteFile(file: File) {
  return trash(file.fullPath);
}

export async function saveFile(file: File, isUpdate = false): Promise<File> {
  const toastPromise = showToast({
    style: Toast.Style.Animated,
    title: isUpdate ? "Updating Bookmark" : "Saving Bookmark",
  });
  const savePromise = saveToObsidian(file);

  const [toast, saved] = await Promise.allSettled([toastPromise, savePromise]);
  if (toast.status === "rejected") {
    throw new Error("Unexpected: Toast failed to display.");
  }
  if (saved.status === "rejected") {
    toast.value.style = Toast.Style.Failure;
    toast.value.message = String(saved.reason);
    toast.value.show();
    return Promise.reject(saved.reason);
  } else {
    toast.value.hide();
    return file;
  }
}

const markAs = (read: boolean) => (file: File) => {
  const newFile: File = { ...file, attributes: { ...file.attributes, read } };
  return saveFile(newFile);
};
export const markAsRead = markAs(true);
export const markAsUnread = markAs(false);

export function toggleDetails(setDetails: Dispatch<SetStateAction<boolean>>) {
  setDetails((details) => !details);
}
