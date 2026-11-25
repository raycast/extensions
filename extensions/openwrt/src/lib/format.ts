import { Color, type Keyboard } from "@raycast/api";
import type { IwinfoAssocEntry, WifiBand } from "./types";

/** Creates a cross-platform Raycast shortcut using Cmd on macOS and Ctrl on Windows. */
export function modShortcut(extraModifiers: ("shift" | "alt")[], key: Keyboard.KeyEquivalent): Keyboard.Shortcut {
  const macModifiers: Keyboard.KeyModifier[] = [
    "cmd",
    ...extraModifiers.map((mod): Keyboard.KeyModifier => (mod === "alt" ? "opt" : mod)),
  ];
  const winModifiers: Keyboard.KeyModifier[] = ["ctrl", ...extraModifiers];

  return {
    macOS: { modifiers: macModifiers, key },
    Windows: { modifiers: winModifiers, key },
  };
}

function formatByteValue(value: number, unitIndex: number): string {
  return unitIndex === 0 ? `${Math.round(value)}` : value >= 10 ? value.toFixed(1) : value.toFixed(2);
}

/** Formats a byte count into a human-readable string. */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes) || bytes < 0) {
    return "Unknown";
  }
  if (bytes === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  let formatted = formatByteValue(value, unitIndex);
  while (Number(formatted) >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
    formatted = formatByteValue(value, unitIndex);
  }

  return `${formatted} ${units[unitIndex]}`;
}

/** Formats a duration in seconds into compact human-readable segments. */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) {
    return "Unknown";
  }

  const total = Math.floor(seconds);
  if (total < 60) {
    return `${total}s`;
  }

  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m ${secs}s`;
}

/** Formats Linux fixed-point sysinfo load average values (scaled by 65536). */
export function formatLoadAverage(load: [number, number, number] | undefined): string {
  if (!Array.isArray(load) || load.length !== 3 || !load.every((v) => Number.isFinite(v))) {
    return "Unknown";
  }
  return load.map((v) => (v / 65536).toFixed(2)).join(", ");
}

/** Formats a percentage ratio cleanly. */
export function formatPercent(part: number, total: number): string {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) {
    return "0%";
  }
  const clampedPart = Math.max(0, part);
  return `${Math.round((clampedPart / total) * 100)}%`;
}

/** Formats an iwinfo bitrate (kbps) into Mbps. */
export function formatBitrateKbps(kbps: number | null | undefined): string {
  if (kbps === null || kbps === undefined || !Number.isFinite(kbps) || kbps <= 0) {
    return "Unknown";
  }
  const mbps = kbps / 1000;
  return mbps >= 100 ? `${Math.round(mbps)} Mbps` : `${mbps.toFixed(1)} Mbps`;
}

/** Maps a wireless frequency in MHz to a Wi-Fi band label. */
export function formatFrequencyBand(freqMhz: number | null | undefined): WifiBand {
  if (!freqMhz || !Number.isFinite(freqMhz)) {
    return "Unknown";
  }
  if (freqMhz >= 2400 && freqMhz <= 2500) {
    return "2.4 GHz";
  }
  if (freqMhz >= 5000 && freqMhz <= 5900) {
    return "5 GHz";
  }
  if (freqMhz > 5900 && freqMhz <= 7125) {
    return "6 GHz";
  }
  return "Unknown";
}

/** Derives the highest negotiated Wi-Fi generation from an iwinfo association entry. */
export function formatWifiStandard(entry: IwinfoAssocEntry): string | null {
  if (entry.tx?.eht || entry.rx?.eht) {
    return "Wi-Fi 7";
  }
  if (entry.tx?.he || entry.rx?.he) {
    return "Wi-Fi 6";
  }
  if (entry.tx?.vht || entry.rx?.vht) {
    return "Wi-Fi 5";
  }
  if (entry.tx?.ht || entry.rx?.ht) {
    return "Wi-Fi 4";
  }
  return null;
}

/** Classifies Wi-Fi RSSI (dBm) into a human label and Raycast tag color. */
export function getSignalMeta(signalDbm: number | null | undefined): {
  label: string;
  color: Color;
} {
  if (signalDbm === null || signalDbm === undefined || !Number.isFinite(signalDbm) || signalDbm >= 0) {
    return { label: "Unknown", color: Color.SecondaryText };
  }
  if (signalDbm >= -55) {
    return { label: "Excellent", color: Color.Green };
  }
  if (signalDbm >= -67) {
    return { label: "Good", color: Color.Blue };
  }
  if (signalDbm >= -75) {
    return { label: "Fair", color: Color.Yellow };
  }
  if (signalDbm >= -82) {
    return { label: "Weak", color: Color.Orange };
  }
  return { label: "Poor", color: Color.Red };
}

/** Wraps content in a fenced Markdown block safe against inner backtick runs. */
export function buildSafeCodeBlock(content: string, language = ""): string {
  const matches = content.match(/`+/g);
  const longestRun = matches ? matches.reduce((max, m) => Math.max(max, m.length), 0) : 0;
  const fence = "`".repeat(Math.max(3, longestRun + 1));
  return `${fence}${language}\n${content}\n${fence}`;
}

/** Escapes special Markdown inline code ticks in identifiers or paths. */
export function inlineCode(text: string): string {
  if (text.length === 0) {
    return "";
  }
  const matches = text.match(/`+/g);
  const longestRun = matches ? matches.reduce((max, m) => Math.max(max, m.length), 0) : 0;
  const ticks = "`".repeat(longestRun + 1);
  const needsPadding =
    text.startsWith("`") ||
    text.endsWith("`") ||
    (text.startsWith(" ") && text.endsWith(" ") && text.trim().length > 0);
  return needsPadding ? `${ticks} ${text} ${ticks}` : `${ticks}${text}${ticks}`;
}

function splitUniqueCsv(source: string, lowercase: boolean): string[] {
  const seen = new Set<string>();
  const items: string[] = [];

  for (const part of source.split(",")) {
    const cleaned = lowercase ? part.trim().toLowerCase() : part.trim();
    if (cleaned && !seen.has(cleaned)) {
      seen.add(cleaned);
      items.push(cleaned);
    }
  }

  return items;
}

/** Splits a comma-separated preference string into clean unique entries. */
export function parseCsvPreference(raw: string | undefined, fallback: string[], lowercase = false): string[] {
  const parsed = raw?.trim() ? splitUniqueCsv(raw, lowercase) : [];
  if (parsed.length > 0) {
    return parsed;
  }
  return splitUniqueCsv(fallback.join(","), lowercase);
}

/** Escapes inline Markdown formatting characters in plain text. */
export function escapeMarkdownText(text: string): string {
  return text.replace(/[\\*_[\]]/g, "\\$&");
}

/** Collapses newlines and escapes unescaped pipe characters for a single GFM table cell. */
export function escapeMarkdownCell(value: string): string {
  return value
    .replace(/\r\n|\r|\n/g, " ")
    .replace(/(\\*)\|/g, (_, slashes: string) => (slashes.length % 2 === 0 ? `${slashes}\\|` : `${slashes}|`))
    .trim();
}

/** Builds a clean GitHub-Flavored Markdown table. */
export function buildMarkdownTable(headers: string[], rows: string[][]): string {
  if (headers.length === 0 || rows.length === 0) {
    return "";
  }
  const head = `| ${headers.map(escapeMarkdownCell).join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${headers.map((_, idx) => escapeMarkdownCell(row[idx] ?? "")).join(" | ")} |`);
  return [head, sep, ...body].join("\n");
}

/** Builds a two-column Key / Value Markdown table, omitting rows with empty keys. */
export function buildKeyValueTable(rows: Array<[string, string]>, keyHeader = "Metric", valueHeader = "Value"): string {
  const validRows = rows.filter(([k]) => k.trim().length > 0);
  return buildMarkdownTable(
    [keyHeader, valueHeader],
    validRows.map(([k, v]) => [`**${escapeMarkdownText(k.trim())}**`, v]),
  );
}

/** Formats a millisecond timestamp as a short relative age label. */
export function formatRelativeAge(timestampMs: number | null | undefined): string {
  if (!timestampMs || !Number.isFinite(timestampMs) || timestampMs <= 0) {
    return "unknown";
  }
  const diffSec = Math.max(0, Math.floor((Date.now() - timestampMs) / 1000));
  if (diffSec < 10) {
    return "just now";
  }
  if (diffSec < 60) {
    return `${diffSec}s ago`;
  }
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) {
    return `${mins}m ago`;
  }
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Formats a concise status badge string when showing cached or stale data. */
export function formatCacheBadge(state: {
  isCached: boolean;
  isLoading: boolean;
  error?: Error;
  updatedAt: number | null;
}): string | null {
  if (state.isCached) {
    const age = formatRelativeAge(state.updatedAt);
    if (state.isLoading) {
      return `Cached (${age} · Updating...)`;
    }
    if (state.error) {
      return `Cached (${age} · Refresh failed)`;
    }
    return `Cached (${age})`;
  }
  if (state.error && state.updatedAt) {
    if (state.isLoading) {
      return "Updating...";
    }
    const age = formatRelativeAge(state.updatedAt);
    return `Stale (${age} · Refresh failed)`;
  }
  return null;
}

/** Formats an epoch timestamp (seconds) in local time. */
export function formatTimestamp(epochSeconds: number | null | undefined): string {
  if (!epochSeconds || !Number.isFinite(epochSeconds) || epochSeconds <= 0) {
    return "Unknown";
  }
  const date = new Date(epochSeconds * 1000);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return date.toLocaleString();
}
