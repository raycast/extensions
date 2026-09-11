import { DownloadType } from "../types";

export const formatBytes = (bytes: number): string => {
  if (!bytes || bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export const formatTypeLabel = (type: DownloadType): string => {
  const labels: Record<DownloadType, string> = {
    torrent: "Torrent",
    webdl: "Web",
    usenet: "Usenet",
  };
  return labels[type];
};
