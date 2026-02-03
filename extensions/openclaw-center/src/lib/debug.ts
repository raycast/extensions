/**
 * Debug logging for OpenClaw Center
 * Logs are visible in Raycast's developer console (View > Toggle Developer Tools)
 */

import { environment } from "@raycast/api";

const DEBUG_ENABLED = environment.isDevelopment;
const DEBUG_PREFIX = "[OpenClaw]";

export interface DebugLogEntry {
  timestamp: Date;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  data?: unknown;
}

// Keep recent logs in memory for display
const recentLogs: DebugLogEntry[] = [];
const MAX_LOGS = 100;

function addLog(entry: DebugLogEntry) {
  recentLogs.push(entry);
  if (recentLogs.length > MAX_LOGS) {
    recentLogs.shift();
  }
}

export function debugLog(
  message: string,
  data?: unknown,
  level: "info" | "warn" | "error" | "debug" = "debug",
) {
  if (!DEBUG_ENABLED) return;

  const entry: DebugLogEntry = {
    timestamp: new Date(),
    level,
    message,
    data,
  };
  addLog(entry);

  const timestamp = entry.timestamp.toISOString().split("T")[1].slice(0, 12);
  const prefix = `${DEBUG_PREFIX} [${timestamp}]`;

  if (data !== undefined) {
    if (level === "error") {
      console.error(prefix, message, data);
    } else if (level === "warn") {
      console.warn(prefix, message, data);
    } else {
      console.log(prefix, message, data);
    }
  } else {
    if (level === "error") {
      console.error(prefix, message);
    } else if (level === "warn") {
      console.warn(prefix, message);
    } else {
      console.log(prefix, message);
    }
  }
}

export function debugInfo(message: string, data?: unknown) {
  debugLog(message, data, "info");
}

export function debugWarn(message: string, data?: unknown) {
  debugLog(message, data, "warn");
}

export function debugError(message: string, data?: unknown) {
  debugLog(message, data, "error");
}

export function getRecentLogs(): DebugLogEntry[] {
  return [...recentLogs];
}

export function clearLogs() {
  recentLogs.length = 0;
}

export function formatLogsAsMarkdown(): string {
  if (recentLogs.length === 0) {
    return "*No debug logs yet*";
  }

  let md = "";
  for (const log of recentLogs.slice(-20)) {
    const time = log.timestamp.toLocaleTimeString();
    const level = log.level.toUpperCase().padEnd(5);
    const dataStr =
      log.data !== undefined ? ` ${JSON.stringify(log.data)}` : "";
    md += `\`${time}\` **${level}** ${log.message}${dataStr}\n`;
  }
  return md;
}
