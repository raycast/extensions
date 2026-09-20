import { getPreferenceValues } from "@raycast/api";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

export const preferences = getPreferenceValues();

export const execp = promisify(exec);

export function getCliPath(): string {
  const cliPath = preferences.cliPath;

  if (cliPath) return cliPath;

  return path.join("C:", "Program Files", "Windhawk", "windhawk-cli.exe");
}

export function timestampToUTCDate(timestamp: number): string {
  const date = new Date(timestamp);

  const pad = (value: number): string => String(value).padStart(2, "0");

  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
  );
}

export function timestampToLongUTCDate(timestamp: number): string {
  const date = new Date(timestamp);

  if (!Number.isFinite(timestamp) || Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  const datePart = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);

  const timePart = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  }).format(date);

  return `${datePart} at ${timePart}`;
}
