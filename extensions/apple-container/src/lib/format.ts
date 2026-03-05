import { Color, Icon, Image } from "@raycast/api";
import { PortMapping } from "./container";

export function relativeTime(date: string): string {
  if (!date) return "";
  const now = Date.now();
  const then = new Date(date).getTime();
  if (isNaN(then)) return "";
  const diffMs = now - then;
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[i]}`;
}

export function formatMemory(bytes: number): string {
  if (bytes === 0) return "—";
  return formatBytes(bytes);
}

export function formatCpus(cpus: number): string {
  if (cpus === 0) return "—";
  return `${cpus} CPU${cpus !== 1 ? "s" : ""}`;
}

export function formatMountType(type: string): string {
  switch (type) {
    case "virtiofs":
      return "VirtioFS";
    case "tmpfs":
      return "tmpfs";
    case "volume":
      return "Volume";
    default:
      return type;
  }
}

export function statusIcon(status: string): Image.ImageLike {
  switch (status) {
    case "running":
      return { source: Icon.CircleFilled, tintColor: Color.Green };
    case "stopped":
      return { source: Icon.CircleFilled, tintColor: Color.SecondaryText };
    case "created":
      return { source: Icon.Circle, tintColor: Color.SecondaryText };
    default:
      return { source: Icon.CircleFilled, tintColor: Color.Red };
  }
}

export function portsString(ports: PortMapping[]): string {
  if (ports.length === 0) return "";
  return ports.map((p) => `${p.hostPort}:${p.containerPort}`).join(", ");
}
