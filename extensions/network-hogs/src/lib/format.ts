import type { AppUsage, NetworkSnapshot, Units } from "../types";
import { sortApps } from "./usage";

export function markdownText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("|", "&#124;")
    .replace(/[\\`*_[\]]/g, "\\$&")
    .replace(/[\r\n]/g, " ");
}

function scaled(value: number, suffixes: string[]): string {
  const amount = Math.max(0, value);
  const index = Math.min(amount > 0 ? Math.floor(Math.log10(amount) / 3) : 0, suffixes.length - 1);
  const safeIndex = Math.max(0, index);
  const number = amount / 1000 ** safeIndex;
  return `${number.toFixed(number >= 100 || safeIndex === 0 ? 0 : 1)} ${suffixes[safeIndex]}`;
}

export function formatRate(bytesPerSecond: number, units: Units = "bytes"): string {
  return units === "bits"
    ? scaled(bytesPerSecond * 8, ["bps", "Kbps", "Mbps", "Gbps", "Tbps"])
    : scaled(bytesPerSecond, ["B/s", "KB/s", "MB/s", "GB/s", "TB/s"]);
}

export function formatBytes(bytes: number): string {
  return scaled(bytes, ["B", "KB", "MB", "GB", "TB"]);
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export function summary(snapshot: NetworkSnapshot, apps: AppUsage[], units: Units): string {
  return [
    `Network Hogs · ${new Date(snapshot.timestamp).toLocaleString()}`,
    `Observed for ${formatDuration(snapshot.sampledSeconds)}; totals exclude pauses.`,
    ...sortApps(apps)
      .slice(0, 5)
      .map(
        (app, index) =>
          `${index + 1}. ${app.name}: ↓ ${formatRate(app.downloadBps, units)} · ↑ ${formatRate(app.uploadBps, units)} · ${formatBytes(app.downloadedBytes + app.uploadedBytes)} observed`,
      ),
    "Shared services and VPNs may overlap with app traffic. This is not a connection speed test.",
  ].join("\n");
}
