import { Session } from "./types";
import { formatDateTime, formatHMS, sessionTotalSeconds, sortedSpaces, spaceName } from "./format";

function csvEscape(value: string | number): string {
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Build the CSV text for a session's per-space breakdown. */
export function sessionToCsv(session: Session): string {
  const total = sessionTotalSeconds(session);
  const rows: string[] = [];

  // Metadata header block.
  rows.push(`Session,${csvEscape(session.name)}`);
  rows.push(`Started,${csvEscape(formatDateTime(session.startedAt))}`);
  rows.push(`Stopped,${csvEscape(session.stoppedAt ? formatDateTime(session.stoppedAt) : "in progress")}`);
  rows.push(`Total,${csvEscape(formatHMS(total))}`);
  rows.push("");

  // Table.
  rows.push(["Space", "Duration", "Percentage"].join(","));
  for (const rec of sortedSpaces(session)) {
    const pct = total > 0 ? ((rec.seconds / total) * 100).toFixed(1) : "0.0";
    rows.push([csvEscape(spaceName(rec)), formatHMS(rec.seconds), `${pct}%`].join(","));
  }

  return rows.join("\n") + "\n";
}

/** CSV filename for a session, based on when it started, e.g. "2026-07-06-13h49.csv". */
export function sessionCsvFilename(session: Session): string {
  const d = new Date(session.startedAt);
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}h${pad(d.getMinutes())}`;
  return `${stamp}.csv`;
}
