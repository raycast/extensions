import { MachineSpec } from "../types";

export function formatBytes(bytes: number | undefined) {
  if (bytes === undefined || bytes === null) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

export function formatSpec(spec: MachineSpec | undefined) {
  if (!spec) return "—";
  const memGb = spec.memMiB / 1024;
  return `${spec.vcpus} vCPU · ${Number.isInteger(memGb) ? memGb : memGb.toFixed(1)} GB`;
}

export function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds} sec`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  if (hours < 24) return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} hr`;
  const days = hours / 24;
  return `${Number.isInteger(days) ? days : days.toFixed(1)} day${days === 1 ? "" : "s"}`;
}

/** "in 25 min", "3 hr ago" */
export function formatRelative(date: string | Date) {
  const diffSeconds = Math.round((new Date(date).getTime() - Date.now()) / 1000);
  const text = formatDuration(Math.max(Math.abs(diffSeconds), 1));
  return diffSeconds >= 0 ? `in ${text}` : `${text} ago`;
}

export function formatDateTime(date: string | Date) {
  return new Date(date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function percent(used: number, total: number) {
  return total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
}

/** A ten-cell text bar, e.g. ▰▰▰▱▱▱▱▱▱▱ */
export function progressBar(used: number, total: number) {
  const filled = Math.round(percent(used, total) / 10);
  return "▰".repeat(filled) + "▱".repeat(10 - filled);
}

/** Wraps text in a code fence that is longer than any backtick run inside it. */
export function codeBlock(text: string, language = "") {
  const longest = Math.max(2, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const fence = "`".repeat(longest + 1);
  return `${fence}${language}\n${text}\n${fence}`;
}

/** Parses `KEY=value` lines (blank lines and `#` comments are skipped). Values are kept as typed, spaces included. */
export function parseKeyValueLines(text: string | undefined) {
  // No prototype, so a key such as `__proto__` is kept like any other.
  const result: Record<string, string> = Object.create(null);
  for (const rawLine of (text ?? "").split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const index = line.indexOf("=");
    const key = index > 0 ? line.slice(0, index).trim() : "";
    if (!key) throw new Error(`"${line.trim()}" is not in KEY=value form`);
    result[key] = line.slice(index + 1);
  }
  return result;
}

export function toKeyValueLines(values: Record<string, string>) {
  return Object.entries(values)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}
