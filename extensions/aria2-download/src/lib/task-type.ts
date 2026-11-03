import {
  formatEta,
  formatPercent,
  getFileNameFromPath,
  parseBytes,
} from "./format";
import { isMagnetUri, isNetdiskUrl } from "./netdisk";
import { Aria2Task, TaskKind } from "./types";

export function getPrimaryUri(task: Aria2Task): string | undefined {
  for (const file of task.files ?? []) {
    const uri = file.uris?.find((entry) => entry.uri)?.uri;
    if (uri) return uri;
  }
  return undefined;
}

export function getTaskKind(task: Aria2Task): TaskKind {
  if (task.bittorrent) return "bt";
  const uri = getPrimaryUri(task);
  if (isMagnetUri(uri)) return "magnet";
  if (isNetdiskUrl(uri)) return "netdisk";
  return "direct";
}

export function getTaskName(task: Aria2Task): string {
  if (task.bittorrent?.info?.name) return task.bittorrent.info.name;
  const firstPath = task.files?.[0]?.path;
  if (firstPath) return getFileNameFromPath(firstPath);
  const uri = getPrimaryUri(task);
  if (uri) {
    try {
      const parsed = new URL(uri);
      const name = getFileNameFromPath(decodeURIComponent(parsed.pathname));
      if (name && name !== "/") return name;
      if (parsed.protocol === "magnet:")
        return `Magnet ${task.gid.slice(0, 6)}`;
    } catch {
      // Fall through to the gid.
    }
  }
  return `Download ${task.gid.slice(0, 6)}`;
}

export function getTaskDirectory(task: Aria2Task): string {
  return task.dir ?? "";
}

export function getTaskProgress(task: Aria2Task): number {
  return formatPercent(task.completedLength, task.totalLength);
}

export function isMetadataTask(task: Aria2Task): boolean {
  return (
    task.status === "active" &&
    task.bittorrent !== undefined &&
    parseBytes(task.totalLength) <= 0
  );
}

export function getTaskEta(task: Aria2Task): string {
  return formatEta(task.totalLength, task.completedLength, task.downloadSpeed);
}

export function getTaskKindLabel(kind: TaskKind): string {
  switch (kind) {
    case "netdisk":
      return "Netdisk";
    case "magnet":
      return "Magnet";
    case "torrent":
    case "bt":
      return "BT";
    default:
      return "Direct";
  }
}

export function getTaskKindEmoji(kind: TaskKind): string {
  switch (kind) {
    case "netdisk":
      return "☁️";
    case "magnet":
      return "🧲";
    case "torrent":
    case "bt":
      return "🧩";
    default:
      return "🌐";
  }
}

export function getTaskStatusLabel(status: Aria2Task["status"]): string {
  switch (status) {
    case "active":
      return "Downloading";
    case "waiting":
      return "Waiting";
    case "paused":
      return "Paused";
    case "complete":
      return "Completed";
    case "error":
      return "Failed";
    case "removed":
      return "Removed";
    default:
      return status;
  }
}

export function isActiveTask(task: Aria2Task): boolean {
  return task.status === "active";
}

export function isWaitingTask(task: Aria2Task): boolean {
  return task.status === "waiting" || task.status === "paused";
}

export function isStoppedTask(task: Aria2Task): boolean {
  return (
    task.status === "complete" ||
    task.status === "error" ||
    task.status === "removed"
  );
}

export function getTaskError(task: Aria2Task): string {
  if (!task.errorCode || task.errorCode === "0") return task.errorMessage ?? "";
  return task.errorMessage
    ? `[${task.errorCode}] ${task.errorMessage}`
    : `aria2 error ${task.errorCode}`;
}

export function getFileCount(task: Aria2Task): number {
  return task.files?.length ?? 0;
}
