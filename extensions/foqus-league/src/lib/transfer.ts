import { MAX_SESSION_MINUTES } from "./log.ts";
import { parseSession } from "./store.ts";
import { dayKey } from "./streaks.ts";
import type { Session } from "./types.ts";

export const EXPORT_VERSION = 1;

export function exportFilename(now = new Date()): string {
  return `foqus-sessions-${dayKey(now)}.json`;
}

export function serializeSessions(sessions: Session[], now = new Date()): string {
  return `${JSON.stringify({ foqus: EXPORT_VERSION, exportedAt: now.toISOString(), sessions }, null, 2)}\n`;
}

function rowsOf(text: string): unknown[] | null {
  try {
    const doc: unknown = JSON.parse(text);
    if (Array.isArray(doc)) return doc;
    const sessions = (doc as { sessions?: unknown } | null)?.sessions;
    return Array.isArray(sessions) ? sessions : null;
  } catch {
    const rows = text.split("\n").flatMap((line) => {
      try {
        return line.trim() ? [JSON.parse(line) as unknown] : [];
      } catch {
        return [];
      }
    });
    return rows.length ? rows : null;
  }
}

export function parseImport(text: string, now = Date.now()): Session[] {
  const rows = rowsOf(text.trim());
  if (!rows) throw new Error("Not a Foqus export");
  const allowed = (s: Session) => s.duration >= 1 && s.duration <= MAX_SESSION_MINUTES && s.start <= now;
  return rows.map(parseSession).filter((s): s is Session => s !== null && allowed(s));
}
