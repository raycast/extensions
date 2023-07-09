import { DownloadFileData } from "../schema";

export const formatFileSize = (sizeInBytes: number): string => {
  if (!sizeInBytes) {
    return "Unknown";
  }

  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(sizeInBytes) / Math.log(1024));
  const size = sizeInBytes / Math.pow(1024, i);

  return `${i === 0 ? size.toFixed(0) : size.toFixed(2)} ${sizes[i]}`;
};

export const formatGenericProperty = <T>(value: T): string => {
  if (!value) return "*Unknown*";
  return String(value);
};

export const parseFileType = (fileData: DownloadFileData) => {
  const mime_type = fileData?.mimeType ?? null;
  const file_name = fileData?.filename;

  const type_from_mime_type = mime_type?.split("/")[0] ?? null;

  if (type_from_mime_type) return type_from_mime_type;
  const extension_from_file_name = file_name?.split(".").pop() ?? null;

  if (extension_from_file_name) return extension_from_file_name;

  return "unknown";
};

export const isExternalHost = (download: DownloadFileData) => {
  return download?.host !== "real-debrid.com";
};
