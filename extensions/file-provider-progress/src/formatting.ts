import { Color, Icon } from "@raycast/api";
import type { DomainSnapshot, TransferProgress } from "./models";

const decimalUnits = ["B", "KB", "MB", "GB", "TB", "PB"];

export type TransferDirection = "upload" | "download";

export type ProgressRow = {
  label: string;
  fraction: number;
  value: string;
  target: string;
  gradientStart: string;
  gradientEnd: string;
};

const TRANSFER_THEME: Record<TransferDirection, { label: string; gradientStart: string; gradientEnd: string }> = {
  upload: { label: "Uploading", gradientStart: "#2DD4FF", gradientEnd: "#0A84FF" },
  download: { label: "Downloading", gradientStart: "#67E8A5", gradientEnd: "#30D158" },
};

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes)) {
    return "unknown";
  }

  let value = Math.max(0, bytes);
  let unitIndex = 0;

  while (value >= 1000 && unitIndex < decimalUnits.length - 1) {
    value /= 1000;
    unitIndex += 1;
  }

  const digits = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(digits)} ${decimalUnits[unitIndex]}`;
}

export function formatPercent(fraction: number): string {
  if (!Number.isFinite(fraction)) {
    return "unknown";
  }

  return `${(fraction * 100).toFixed(1)}%`;
}

export function formatTransfer(progress: TransferProgress | null | undefined): string {
  if (!progress) {
    return "No active byte total";
  }

  return `${formatBytes(progress.completedBytes)} / ${formatBytes(progress.totalBytes)} (${formatPercent(transferFraction(progress))})`;
}

export function formatTransferProgressRow(
  direction: TransferDirection,
  progress: TransferProgress | null | undefined,
): ProgressRow {
  const { label, gradientStart, gradientEnd } = TRANSFER_THEME[direction];

  if (!progress) {
    return {
      label,
      fraction: 1,
      value: "Idle",
      target: "No active byte total",
      gradientStart,
      gradientEnd,
    };
  }

  return {
    label,
    fraction: transferFraction(progress),
    value: formatBytes(progress.completedBytes),
    target: formatBytes(progress.totalBytes),
    gradientStart,
    gradientEnd,
  };
}

export function formatIndexingProgressRow(
  pending: number | null | undefined,
  total: number | null | undefined,
): ProgressRow {
  if (pending === null || pending === undefined || total === null || total === undefined) {
    return {
      label: "Indexing",
      fraction: 1,
      value: "Idle",
      target: "No index total",
      gradientStart: "#FFD60A",
      gradientEnd: "#FF9F0A",
    };
  }

  const completed = Math.max(total - pending, 0);
  return {
    label: "Indexing",
    fraction: indexingCompletionFraction(pending, total),
    value: `${formatCount(completed)} indexed`,
    target: `${formatCount(total)} total, ${formatCount(pending)} pending`,
    gradientStart: "#FFD60A",
    gradientEnd: "#FF9F0A",
  };
}

export function formatProgressMarkdown(row: ProgressRow): string {
  return [
    `**${row.label}** · ${row.value} (${row.target})`,
    `![${row.label} ${formatPercent(row.fraction)}](${progressSvgDataUri(row.fraction, row.gradientStart, row.gradientEnd)})`,
  ].join("\n");
}

export function formatObservedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString();
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat().format(value);
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

function transferFraction(progress: TransferProgress): number {
  if (progress.totalBytes === 0 && progress.completedBytes === 0) {
    return 1;
  }

  return progress.fraction;
}

function indexingCompletionFraction(pending: number, total: number): number {
  if (total <= 0) {
    return pending <= 0 ? 1 : 0;
  }

  return (total - pending) / total;
}

function progressSvgDataUri(fraction: number, gradientStart: string, gradientEnd: string): string {
  const width = 560;
  const height = 18;
  const radius = 6;
  const normalized = clamp01(fraction);
  const fillWidth = Math.round(width * normalized);
  const gradientId = `g-${gradientStart.slice(1)}-${gradientEnd.slice(1)}`;

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    "<defs>",
    `<linearGradient id="${gradientId}" x1="100%" y1="0%" x2="0%" y2="0%">`,
    `<stop offset="0%" stop-color="${gradientStart}"/>`,
    `<stop offset="100%" stop-color="${gradientEnd}"/>`,
    "</linearGradient>",
    "</defs>",
    `<rect x="0" y="0" width="${width}" height="${height}" rx="${radius}" fill="#4A4A4D" opacity="0.35"/>`,
    fillWidth > 0
      ? `<rect x="0" y="0" width="${fillWidth}" height="${height}" rx="${radius}" fill="url(#${gradientId})"/>`
      : "",
    "</svg>",
  ].join("");

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function domainStatusIcon(snapshot: DomainSnapshot) {
  if (snapshot.probeError) {
    return { source: Icon.Warning, tintColor: Color.Red };
  }

  if (snapshot.health.needsAuth) {
    return { source: Icon.Lock, tintColor: Color.Orange };
  }

  if (snapshot.upload || snapshot.download) {
    return { source: Icon.Cloud, tintColor: Color.Blue };
  }

  if (snapshot.health.isActive) {
    return { source: Icon.Circle, tintColor: Color.Green };
  }

  return { source: Icon.CheckCircle, tintColor: Color.Green };
}
