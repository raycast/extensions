import { environment } from "@raycast/api";
import { appendFileSync, mkdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { LIVENESS_LOG_MAX_BYTES, LIVENESS_LOG_KEEP_LINES } from "./constants";

export const LOG_PATH = join(environment.supportPath, "focus.log");

export function logEvent(
  action: string,
  eventId: string,
  title: string,
  start: Date | null,
  durationMin: number | null,
): void {
  const ts = formatTimestamp(new Date());
  const startStr = start ? formatHHMM(start) : "-";
  const durationStr = durationMin !== null ? `${durationMin}min` : "-";
  const line =
    `[${ts}] ${action.padEnd(26)}` +
    ` event_id="${eventId}"` +
    ` title="${title}"` +
    ` start="${startStr}"` +
    ` duration=${durationStr}\n`;
  write(line);
}

export function logSystem(message: string): void {
  const ts = formatTimestamp(new Date());
  write(`[${ts}] ${message}\n`);
}

function write(line: string): void {
  try {
    mkdirSync(dirname(LOG_PATH), { recursive: true });
    appendFileSync(LOG_PATH, line);
  } catch (e) {
    console.error(`[logger] Could not write to ${LOG_PATH}: ${e}`);
  }
}

export const LIVENESS_PATH = join(environment.supportPath, "liveness.log");

export function logLiveness(message: string): void {
  const ts = formatTimestamp(new Date());
  const line = `[${ts}] ${message}\n`;
  try {
    mkdirSync(dirname(LIVENESS_PATH), { recursive: true });
    appendFileSync(LIVENESS_PATH, line);
    capLivenessLog();
  } catch (e) {
    console.error(`[logger] Could not write to ${LIVENESS_PATH}: ${e}`);
  }
}

function capLivenessLog(): void {
  if (statSync(LIVENESS_PATH).size <= LIVENESS_LOG_MAX_BYTES) return;
  const lines = readFileSync(LIVENESS_PATH, "utf8").split("\n");
  const kept = lines.filter((l) => l.length > 0).slice(-LIVENESS_LOG_KEEP_LINES);
  writeFileSync(LIVENESS_PATH, kept.join("\n") + "\n");
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatTimestamp(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatHHMM(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
