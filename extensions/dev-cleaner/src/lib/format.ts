import os from "node:os";
import path from "node:path";

import type { CommandSpec } from "../types";

export function formatBytes(bytes?: number): string {
  if (bytes === undefined) return "Size unavailable";
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unitIndex;
  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}

export function formatAge(date?: Date, now = new Date()): string | undefined {
  if (!date) return undefined;
  const days = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 86_400_000));
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export function formatDuration(start: string, end: string): string {
  const totalSeconds = Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000));
  if (Number.isNaN(totalSeconds)) return "Unknown";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

export function formatCommand(command: CommandSpec): string {
  return [command.executable, ...command.args].join(" ");
}

export function formatPath(target: string, homeDirectory = os.homedir()): string {
  if (!homeDirectory) return target;
  if (target === homeDirectory) return "~";
  const homePrefix = homeDirectory.endsWith(path.sep) ? homeDirectory : `${homeDirectory}${path.sep}`;
  return target.startsWith(homePrefix) ? `~${path.sep}${target.slice(homePrefix.length)}` : target;
}
