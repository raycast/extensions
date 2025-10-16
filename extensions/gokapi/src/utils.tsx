import fetch from "node-fetch";
import { FormData } from "formdata-node";
import { File } from "formdata-node";
import { readFile } from "fs/promises";
import path from "path";
import { FormDataEncoder } from "form-data-encoder";
import { Readable } from "stream";
import { Clipboard, Color, getPreferenceValues, List, popToRoot } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import mime from "mime-types";

const preferences = getPreferenceValues<{ server_url?: string; api_key?: string }>();

if (!preferences.server_url || preferences.server_url === "undefined") {
  showFailureToast(new Error("Missing Gokapi server URL"), {
    title: "Could not find the server URL. Please set the Gokapi server URL in the preferences.",
  });
  popToRoot();
}

if (!preferences.api_key || preferences.api_key === "undefined") {
  showFailureToast(new Error("Missing API key"), {
    title: "Could not find the API key. Please set the Gokapi API key in the preferences.",
  });
  popToRoot();
}

const gokapiUrl = preferences.server_url;
const gokapiKey = preferences.api_key ?? "";

export interface GokapiFile {
  Id: string;
  Name: string;
  Size: string;
  ContentType: string;
  UrlDownload: string;
  UrlHotlink: string;
  UnlimitedDownloads: boolean;
  DownloadsRemaining: number;
  UnlimitedTime: boolean;
  ExpireAt: number;
  IsPasswordProtected: boolean;
  IsEncrypted: boolean;
  IsEndToEndEncrypted: boolean;
}

export async function fetchFiles(): Promise<GokapiFile[]> {
  const response = await fetch(`${gokapiUrl}/api/files/list`, {
    method: "GET",
    headers: {
      accept: "application/json",
      apikey: gokapiKey,
    },
  });
  if (!response.ok) {
    throw new Error("Failed to fetch files");
  }
  return (await response.json()) as GokapiFile[];
}

export async function deleteFile(fileId: string): Promise<void> {
  const response = await fetch(`${gokapiUrl}/api/files/delete`, {
    method: "DELETE",
    headers: {
      accept: "*/*",
      id: fileId,
      apikey: gokapiKey,
    },
  });
  if (!response.ok) {
    throw new Error("Failed to delete file");
  }
}

export async function uploadFile(
  filePath: string,
  allowedDownloads: number,
  expiryDays: number,
  password: string,
): Promise<void> {
  const formData = new FormData();
  formData.append("allowedDownloads", String(allowedDownloads));
  formData.append("expiryDays", String(expiryDays));
  formData.append("password", password);
  // Determine the correct MIME type
  const contentType = mime.lookup(filePath) || "application/octet-stream";
  const buffer = await readFile(filePath);
  const fileName = path.basename(filePath);
  const file = new File([buffer], fileName, { type: contentType });
  formData.append("file", file);

  const encoder = new FormDataEncoder(formData);
  const response = await fetch(`${gokapiUrl}/api/files/add`, {
    method: "POST",
    headers: {
      ...encoder.headers,
      accept: "application/json",
      apikey: gokapiKey,
    },
    body: Readable.from(encoder.encode()),
  });
  if (!response.ok) {
    throw new Error("Failed to upload file");
  }
  try {
    const data = (await response.json()) as { FileInfo: { UrlDownload: string } };
    await Clipboard.copy(data.FileInfo.UrlDownload);
  } catch (error) {
    console.error(error);
  }
}

export function getFileTypeIcon(file: GokapiFile) {
  const ct = file.ContentType.toLowerCase();

  if (ct === "application/pdf") {
    return "pdf.svg";
  }

  if (
    ct === "application/msword" ||
    ct === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ct === "application/vnd.ms-word.document.macroEnabled.12" ||
    ct === "application/vnd.apple.pages" ||
    ct === "application/vnd.oasis.opendocument.text"
  ) {
    return "doc.svg";
  }

  if (
    ct === "application/vnd.ms-excel" ||
    ct === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    ct === "application/vnd.ms-excel.sheet.macroEnabled.12" ||
    ct === "application/vnd.apple.numbers" ||
    ct === "application/vnd.oasis.opendocument.spreadsheet"
  ) {
    return "spreadsheet.svg";
  }

  if (
    ct === "application/vnd.ms-powerpoint" ||
    ct === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    ct === "application/vnd.ms-powerpoint.presentation.macroEnabled.12" ||
    ct === "application/vnd.apple.keynote" ||
    ct === "application/vnd.oasis.opendocument.presentation"
  ) {
    return "presentation.svg";
  }

  if (ct.startsWith("video/")) {
    return "video.svg";
  }

  if (ct.startsWith("audio/")) {
    return "audio.svg";
  }

  if (ct.startsWith("image/")) {
    return "image.svg";
  }

  if (ct.startsWith("text/")) {
    return "doc.svg";
  }

  return "other.svg";
}

export function getFileTypeTag(file: GokapiFile) {
  const ct = file.ContentType.toLowerCase();

  if (ct === "application/pdf") {
    return <List.Item.Detail.Metadata.TagList.Item text="PDF" color={Color.Red} />;
  }

  if (
    ct === "application/msword" ||
    ct === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ct === "application/vnd.ms-word.document.macroEnabled.12" ||
    ct === "application/vnd.apple.pages" ||
    ct === "application/vnd.oasis.opendocument.text"
  ) {
    return <List.Item.Detail.Metadata.TagList.Item text="Document" color={Color.Blue} />;
  }

  if (
    ct === "application/vnd.ms-excel" ||
    ct === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    ct === "application/vnd.ms-excel.sheet.macroEnabled.12" ||
    ct === "application/vnd.apple.numbers" ||
    ct === "application/vnd.oasis.opendocument.spreadsheet"
  ) {
    return <List.Item.Detail.Metadata.TagList.Item text="Spreadsheet" color={Color.Green} />;
  }

  if (
    ct === "application/vnd.ms-powerpoint" ||
    ct === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    ct === "application/vnd.ms-powerpoint.presentation.macroEnabled.12" ||
    ct === "application/vnd.apple.keynote" ||
    ct === "application/vnd.oasis.opendocument.presentation"
  ) {
    return <List.Item.Detail.Metadata.TagList.Item text="Presentation" color={Color.Orange} />;
  }

  if (ct.startsWith("video/")) {
    return <List.Item.Detail.Metadata.TagList.Item text="Video" color={Color.Purple} />;
  }

  if (ct.startsWith("audio/")) {
    return <List.Item.Detail.Metadata.TagList.Item text="Audio" color={Color.Yellow} />;
  }

  if (ct.startsWith("image/")) {
    return <List.Item.Detail.Metadata.TagList.Item text="Image" color={Color.Green} />;
  }

  if (ct.startsWith("text/")) {
    return <List.Item.Detail.Metadata.TagList.Item text="Text" color={Color.Blue} />;
  }

  return <List.Item.Detail.Metadata.TagList.Item text="Other" color={Color.SecondaryText} />;
}
