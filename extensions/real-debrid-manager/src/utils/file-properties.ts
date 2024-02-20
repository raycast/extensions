import { Icon } from "@raycast/api";
import { DownloadItemData } from "../schema";

export const formatFileSize = (sizeInBytes: number): string => {
  if (!sizeInBytes) {
    return "Unknown";
  }

  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(sizeInBytes) / Math.log(1024));
  const size = sizeInBytes / Math.pow(1024, i);

  return `${size % 1 === 0 ? size.toFixed(0) : size.toFixed(2)} ${sizes[i]}`;
};

export const formatGenericProperty = <T>(value: T): string => {
  if (!value) return "*Unknown*";
  const stringified = String(value);
  return stringified.charAt(0).toUpperCase() + stringified.slice(1);
};

export const getFileSizeOrQuality = (downloadData: DownloadItemData) => {
  if (downloadData.filesize) {
    return formatFileSize(downloadData.filesize);
  }

  if (downloadData.type) {
    return formatGenericProperty(downloadData.type);
  }

  return "Unknown";
};

export const parseFileType = (fileData: DownloadItemData) => {
  const mime_type = fileData?.mimeType ?? null;
  const file_name = fileData?.filename;

  const type_from_mime_type = mime_type?.split("/")[0] ?? null;

  if (type_from_mime_type) return type_from_mime_type;
  const extension_from_file_name = file_name?.split(".").pop() ?? null;

  if (extension_from_file_name) return extension_from_file_name;

  return "unknown";
};

const DOWNLOAD_FILE_TYPE_ICON_MAP: Record<string, Icon> = {
  audio: Icon.Music,
  video: Icon.PlayFilled,
  iso: Icon.Box,
  application: Icon.Box,
  apk: Icon.Mobile,
  other: Icon.BlankDocument,
};

export const getDownloadItemIcon = (downloadItem: DownloadItemData): string => {
  const fileType = parseFileType(downloadItem);
  return DOWNLOAD_FILE_TYPE_ICON_MAP?.[fileType] ?? DOWNLOAD_FILE_TYPE_ICON_MAP.other;
};

export const isExternalHost = (download: DownloadItemData) => {
  return download?.host !== "real-debrid.com";
};
