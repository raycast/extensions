import { DownloadTask } from "./contract";

export function isDownloading(task: DownloadTask): boolean {
  return task.state === "downloading";
}

export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const index = Math.min(
    Math.floor(Math.log10(Math.max(1, bytes)) / 3),
    units.length - 1,
  );
  const amount = bytes / 1000 ** index;
  return `${amount.toLocaleString("en-US", { maximumFractionDigits: index ? 1 : 0 })} ${units[index]}`;
}

export function downloadProgress(task: DownloadTask): {
  bytes: string;
  percentage?: string;
  speed?: string;
} {
  const knownTotal = task.totalBytes !== undefined && task.totalBytes > 0;
  // Unknown-length transfers export a default zero even before progress is known.
  const hasProgress =
    task.progress !== undefined && (knownTotal || task.progress > 0);
  return {
    bytes: knownTotal
      ? `${formatBytes(task.completedBytes)} / ${formatBytes(task.totalBytes!)}`
      : `${formatBytes(task.completedBytes)} received`,
    percentage:
      task.state !== "merging" && hasProgress
        ? `${Math.floor(task.progress! * 100)}%`
        : undefined,
    speed:
      task.state === "downloading" && task.speed !== undefined
        ? `${formatBytes(task.speed)}/s`
        : undefined,
  };
}
