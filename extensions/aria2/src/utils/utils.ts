import { Status, TaskResponse, Task } from "../types";
import { Color, Icon } from "@raycast/api";
export function getTaskIcon(status: Status): { source: Icon; tintColor: Color } {
  switch (status) {
    case "active":
      return {
        source: Icon.ArrowDownCircle,
        tintColor: Color.Yellow,
      };
    case "waiting":
      return {
        source: Icon.Clock,
        tintColor: Color.Blue,
      };
    case "paused":
      return {
        source: Icon.Pause,
        tintColor: Color.Red,
      };
    case "error":
      return {
        source: Icon.XMarkCircle,
        tintColor: Color.Orange,
      };
    case "complete":
      return {
        source: Icon.CheckCircle,
        tintColor: Color.Green,
      };
    case "removed":
      return {
        source: Icon.Trash,
        tintColor: Color.Magenta,
      };
    default:
      return {
        source: Icon.Play,
        tintColor: Color.Purple,
      };
  }
}

export function formatSize(size: string): string {
  let bytes = parseFloat(size);
  const units = ["B", "KB", "MB", "GB", "TB"];

  let index = 0;
  while (bytes >= 1024 && index < units.length - 1) {
    bytes /= 1024;
    index++;
  }

  return `${bytes.toFixed(2)} ${units[index]}`;
}

export function formatProgress(completedLength: string, totalLength: string): number {
  const completed = parseFloat(completedLength);
  const total = parseFloat(totalLength);

  if (isNaN(completed) || isNaN(total) || total === 0) {
    return 0;
  }

  const percentage = (completed / total) * 100;
  return parseFloat(percentage.toFixed(2));
}

export function formatRemainingTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) {
    return "Unknown";
  }

  const remainingSeconds = Math.floor(seconds);
  const minutes = Math.floor(remainingSeconds / 60) % 60;
  const hours = Math.floor(remainingSeconds / 3600) % 24;
  const days = Math.floor(remainingSeconds / 86400);

  if (days >= 30) {
    const months = Math.floor(days / 30);
    const years = Math.floor(months / 12);

    return `${years}y ${months % 12}m ${days % 30}d`;
  } else if (days >= 1) {
    return `${days}d ${hours}h ${minutes}m`;
  } else {
    const secondsLeft = remainingSeconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secondsLeft
      .toString()
      .padStart(2, "0")}`;
  }
}

export function formatSpeed(speed: string): string {
  let bytesPerSecond = parseFloat(speed);
  const units = ["B/s", "KB/s", "MB/s", "GB/s", "TB/s"];

  let index = 0;
  while (bytesPerSecond >= 1024 && index < units.length - 1) {
    bytesPerSecond /= 1024;
    index++;
  }

  return `${bytesPerSecond.toFixed(2)} ${units[index]}`;
}

export function calculateRemainingTime(completedLength: string, totalLength: string, downloadSpeed: string): string {
  const remainingBytes = parseInt(totalLength) - parseInt(completedLength);
  const remainingTimeSeconds = remainingBytes / parseInt(downloadSpeed);
  return formatRemainingTime(remainingTimeSeconds);
}

export function formatTasks(tasks: TaskResponse[]): Task[] {
  return tasks.map((task) => {
    const infoHash = task.infoHash;
    const file = task.files[0];
    const progress = formatProgress(task.completedLength, task.totalLength);
    let remainingTime: string | undefined;
    let downloadSpeed: string | undefined;
    if (task.status === "active" && progress !== "100.00%") {
      remainingTime = calculateRemainingTime(task.completedLength, task.totalLength, task.downloadSpeed);
      downloadSpeed = formatSpeed(task.downloadSpeed);
    }

    return {
      gid: task.gid,
      fileName: task.bittorrent.info?.name || file.path,
      fileSize: formatSize(task.totalLength),
      progress,
      remainingTime,
      downloadSpeed,
      status: task.status as Status,
      infoHash,
    };
  });
}
