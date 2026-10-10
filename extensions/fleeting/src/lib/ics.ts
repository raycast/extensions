import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { CalendarEvent, eventDescription, eventLocation, formatLocal, formatUtc, rrule } from "./calendar";
import { meetingUrl } from "./urls";

export function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/** Folds a content line at 75 octets, never splitting a multi-byte character. */
export function foldLine(line: string): string {
  const out: string[] = [];
  let current = "";
  let bytes = 0;
  let limit = 75;
  for (const ch of line) {
    const size = Buffer.byteLength(ch);
    if (bytes + size > limit) {
      out.push(current);
      current = "";
      bytes = 0;
      limit = 74; // continuation lines start with a space
    }
    current += ch;
    bytes += size;
  }
  out.push(current);
  return out.join("\r\n ");
}

export function buildIcs(event: CalendarEvent, now: Date = new Date()): string {
  const recurring = event.recurrence !== "none";
  // Recurring events use floating local time so they hold their wall-clock time across DST.
  const stamp = (d: Date) => (recurring ? formatLocal(d) : formatUtc(d));

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Fleeting Raycast Extension//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${randomUUID()}@fleeting-raycast`,
    `DTSTAMP:${formatUtc(now)}`,
    `DTSTART:${stamp(event.start)}`,
    // An elapsed duration avoids equal or stretched local end times at DST changes.
    recurring ? `DURATION:PT${(event.end.getTime() - event.start.getTime()) / 1000}S` : `DTEND:${stamp(event.end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(eventDescription(event))}`,
  ];
  const location = eventLocation(event);
  if (location) {
    lines.push(`LOCATION:${escapeText(location)}`, `URL:${meetingUrl(event.meetingId)}`);
  }
  const rule = rrule(event.recurrence);
  if (rule) lines.push(`RRULE:${rule}`);
  lines.push(
    `CLASS:${event.isPrivate ? "PRIVATE" : "PUBLIC"}`,
    "TRANSP:OPAQUE",
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  );

  return lines.map(foldLine).join("\r\n") + "\r\n";
}

export function icsFileName(event: CalendarEvent): string {
  const slug =
    event.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "meeting";
  const d = event.start;
  const p = (n: number) => String(n).padStart(2, "0");
  return `fleeting-${slug}-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}-${randomUUID()}.ics`;
}

export async function writeIcsFile(event: CalendarEvent, directory: string): Promise<string> {
  await mkdir(directory, { recursive: true });
  const path = join(directory, icsFileName(event));
  await writeFile(path, buildIcs(event), { encoding: "utf8", flag: "wx" });
  return path;
}
