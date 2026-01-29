import { execSync } from "node:child_process";

import type { LogEvent, StoredSession, StartEvent } from "./types";

const LOG_PREDICATE = 'subsystem == "com.raycast.macos" AND category == "focus"';

/**
 * Pads a number to 2 digits with leading zero.
 */
function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Formats Date into log show --start format (YYYY-MM-DD HH:MM:SS).
 */
function formatLogStart(date: Date): string {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());
  const seconds = pad2(date.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Parses log timestamp (date + time with optional .microseconds+tz) into Date.
 * Time may be like "15:39:51.831992+0530" – normalizes +0530 to +05:30 for ISO.
 */
function parseLogTimestamp(datePart: string, timePart: string): Date | null {
  if (!datePart || !timePart) return null;
  const tzMatch = timePart.match(/([+-])(\d{2})(\d{2})$/);
  const normalizedTime = tzMatch ? timePart.replace(/([+-])(\d{2})(\d{2})$/, `$1$2:$3`) : timePart;
  const iso = `${datePart}T${normalizedTime}`;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * True if line is a main log line (starts with YYYY-MM-DD timestamp).
 */
function isMainLogLine(line: string): boolean {
  return /^\d{4}-\d{2}-\d{2}\s+\S+/.test(line.trim());
}

/**
 * From a main log line, get first two tokens (date, time). Returns null if not enough.
 */
function getTimestampParts(line: string): [string, string] | null {
  const trimmed = line.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) return [parts[0], parts[1]];
  return null;
}

/**
 * Find continuation line containing "Goal:" and return the text after "Goal:".
 */
function findGoalInContinuations(lines: string[], startIndex: number, maxLookahead: number): string | null {
  const max = Math.min(lines.length, startIndex + maxLookahead);
  for (let i = startIndex; i < max; i += 1) {
    const line = lines[i];
    if (isMainLogLine(line)) break;
    const match = line.match(/\bGoal:\s*(.*)/i);
    if (match) return match[1].trim() || null;
  }
  return null;
}

/**
 * Queries macOS unified log for Raycast Focus events since startAt.
 * Returns ordered list of start and summary events.
 */
export function getLogEvents(startAt: Date): LogEvent[] {
  const startText = formatLogStart(startAt);
  const command = `log show --predicate '${LOG_PREDICATE}' --info --start "${startText}"`;

  const output = execSync(command, {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 20,
  });

  if (!output) return [];

  const lines = output.split("\n");
  const events: LogEvent[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!isMainLogLine(line)) continue;

    if (line.includes("Start focus session")) {
      const parts = getTimestampParts(line);
      if (!parts) continue;
      const timestamp = parseLogTimestamp(parts[0], parts[1]);
      const goal = findGoalInContinuations(lines, i + 1, 8);
      if (!timestamp || goal == null) continue;
      events.push({ type: "start", goal, start: timestamp });
      continue;
    }

    if (line.includes("Focus session activity summary")) {
      const parts = getTimestampParts(line);
      if (!parts) continue;
      const endTime = parseLogTimestamp(parts[0], parts[1]);
      if (!endTime) continue;
      events.push({ type: "summary", endTime });
    }
  }

  return events;
}

/**
 * Matches start events with summary events to build completed sessions.
 * Skips orphan starts (no summary). Returns StoredSession (start as ISO string).
 */
export function matchSessions(events: LogEvent[]): StoredSession[] {
  const sessions: StoredSession[] = [];
  let currentStart: StartEvent | null = null;

  for (const event of events) {
    if (event.type === "start") {
      currentStart = event;
      continue;
    }

    if (event.type === "summary" && currentStart) {
      const durationMs = event.endTime.getTime() - currentStart.start.getTime();
      const durationMinutes = Math.round((durationMs / 60000) * 10) / 10;
      sessions.push({
        goal: currentStart.goal,
        start: currentStart.start.toISOString(),
        duration: Math.max(0, durationMinutes),
      });
      currentStart = null;
    }
  }

  return sessions;
}
