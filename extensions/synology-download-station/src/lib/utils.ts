import { SynologyTask, TaskProgress, TaskStatus } from "./types";

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return "0 B/s";

  const k = 1024;
  const sizes = ["B/s", "KB/s", "MB/s", "GB/s"];
  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));

  return `${parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return `${hours}h ${minutes}m ${remainingSeconds}s`;
}

export function getTaskProgress(task: SynologyTask): TaskProgress {
  const downloadedSize = task.additional?.transfer?.size_downloaded || 0;
  const totalSize = task.size || 0;
  const downloadSpeed = task.additional?.transfer?.speed_download || 0;
  const uploadSpeed = task.additional?.transfer?.speed_upload || 0;

  const percentage = totalSize > 0 ? Math.round((downloadedSize / totalSize) * 100) : 0;

  return {
    percentage,
    downloadedSize,
    totalSize,
    downloadSpeed,
    uploadSpeed,
  };
}

export function getTaskStatusText(status: TaskStatus): string {
  switch (status) {
    case "waiting":
      return "Waiting";
    case "downloading":
      return "Downloading";
    case "paused":
      return "Paused";
    case "finished":
      return "Finished";
    case "finishing":
      return "Finishing";
    case "extracting":
      return "Extracting";
    case "error":
      return "Error";
    case "seeding":
      return "Seeding";
    default:
      return "Unknown";
  }
}

export function isTaskActive(status: TaskStatus): boolean {
  return ["downloading", "extracting", "finishing", "seeding", "waiting"].includes(status);
}

export function canPauseTask(status: TaskStatus): boolean {
  return ["downloading", "waiting", "seeding"].includes(status);
}

export function canResumeTask(status: TaskStatus): boolean {
  return ["paused", "error"].includes(status);
}

export function validateUrl(url: string): boolean {
  // Check for HTTP/HTTPS URLs
  const httpRegex = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
  if (httpRegex.test(url)) return true;

  // Check for magnet links
  const magnetRegex = /^magnet:\?xt=urn:[a-z0-9]+:[a-z0-9]{32,40}&.*/i;
  if (magnetRegex.test(url)) return true;

  // Check for FTP URLs
  const ftpRegex = /^ftp:\/\/[^\s/$.?#].[^\s]*$/i;
  if (ftpRegex.test(url)) return true;

  return false;
}

export function getEstimatedTimeRemaining(downloadedSize: number, totalSize: number, speed: number): string {
  if (speed === 0 || downloadedSize >= totalSize) return "Unknown";

  const remainingBytes = totalSize - downloadedSize;
  const remainingSeconds = Math.floor(remainingBytes / speed);

  if (remainingSeconds < 60) return `${remainingSeconds}s`;
  if (remainingSeconds < 3600) return `${Math.floor(remainingSeconds / 60)}m`;
  if (remainingSeconds < 86400) return `${Math.floor(remainingSeconds / 3600)}h`;

  return `${Math.floor(remainingSeconds / 86400)}d`;
}

export function truncateTitle(title: string, maxLength: number = 50): string {
  if (title.length <= maxLength) return title;
  return `${title.substring(0, maxLength - 3)}...`;
}

export function isValidTimestamp(timestamp?: number): boolean {
  return timestamp !== undefined && timestamp > 0;
}

export function isValidString(str?: string): boolean {
  return Boolean(str?.trim());
}

export function isValidNumber(num?: number): boolean {
  return num !== undefined && num !== null;
}
