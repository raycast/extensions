import { homedir } from "os";
import path from "path";
import { readdirSync, readFileSync, statSync } from "fs";
import { readFile } from "fs/promises";
import { SearchResult, SourceContext, SourceOutput } from "../types";
import { matchesAllTerms, matchesAny, parseQuery, run, runWithStdin } from "./util";

type Event = {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  start?: number;
  end?: number;
  calendar?: string;
};

const calendarsRoot = path.join(homedir(), "Library/Calendars");
const cache = new Map<string, { mtime: number; events: Event[] }>();
let lastError: string | null = null;

export function getCalendarError(): string | null {
  return lastError;
}

function parseIcsDate(value: string): number | undefined {
  // YYYYMMDDTHHMMSSZ or YYYYMMDDTHHMMSS or YYYYMMDD (all-day)
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?(Z?)$/);
  if (!m) return undefined;
  const [, y, mo, d, h = "0", mi = "0", s = "0", z] = m;
  if (z === "Z") {
    return Date.UTC(+y, +mo - 1, +d, +h, +mi, +s);
  }
  return new Date(+y, +mo - 1, +d, +h, +mi, +s).getTime();
}

function unfoldIcs(text: string): string[] {
  // RFC 5545 line folding: continuation lines start with space/tab.
  const raw = text.split(/\r?\n/);
  const lines: string[] = [];
  for (const line of raw) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
}

function unescapeIcs(s: string): string {
  return s.replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

function parseIcs(text: string, calendarName: string): Event[] {
  const events: Event[] = [];
  const lines = unfoldIcs(text);
  let cur: Event | null = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      cur = { uid: "", summary: "", calendar: calendarName };
      continue;
    }
    if (line === "END:VEVENT") {
      if (cur && (cur.summary || cur.description)) events.push(cur);
      cur = null;
      continue;
    }
    if (!cur) continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const rawKey = line.slice(0, colon);
    const value = line.slice(colon + 1);
    const key = rawKey.split(";")[0].toUpperCase();
    switch (key) {
      case "UID":
        cur.uid = value;
        break;
      case "SUMMARY":
        cur.summary = unescapeIcs(value);
        break;
      case "DESCRIPTION":
        cur.description = unescapeIcs(value);
        break;
      case "LOCATION":
        cur.location = unescapeIcs(value);
        break;
      case "DTSTART":
        cur.start = parseIcsDate(value);
        break;
      case "DTEND":
        cur.end = parseIcsDate(value);
        break;
    }
  }
  return events;
}

function calendarDisplayName(calendarDir: string): string {
  try {
    const info = path.join(calendarDir, "Info.plist");
    const buf = readFileSync(info, "utf8");
    const m = buf.match(/<key>Title<\/key>\s*<string>([^<]+)<\/string>/);
    if (m) return m[1];
  } catch {
    /* ignore */
  }
  return path.basename(calendarDir, ".calendar");
}

/**
 * Pull events directly from EventKit via a Swift script.
 *
 * Why Swift and not JXA/osascript: JXA's ObjC bridge in /usr/bin/osascript does NOT
 * expose `requestFullAccessToEventsCompletion:` (the macOS 14+ API). The legacy
 * `requestAccessToEntityType:completion:` only grants write-only access on modern
 * macOS, so events come back empty. `/usr/bin/swift` ships with macOS and can call
 * the new EventKit APIs directly.
 */
async function loadEventsViaEventKit(
  lookbackDays: number,
  lookaheadDays: number,
  signal: AbortSignal,
): Promise<Event[] | null> {
  const script = `
import EventKit
import Foundation

let lookback = Double(CommandLine.arguments.dropFirst().first ?? "30") ?? 30
let lookahead = Double(CommandLine.arguments.dropFirst(2).first ?? "90") ?? 90

let store = EKEventStore()
let sema = DispatchSemaphore(value: 0)
var granted = false
var errMsg = ""

if #available(macOS 14.0, *) {
  store.requestFullAccessToEvents { ok, err in
    granted = ok
    if let err = err { errMsg = err.localizedDescription }
    sema.signal()
  }
} else {
  store.requestAccess(to: .event) { ok, err in
    granted = ok
    if let err = err { errMsg = err.localizedDescription }
    sema.signal()
  }
}
_ = sema.wait(timeout: .now() + 25)

if !granted {
  print("{\\"error\\":\\"denied: \\(errMsg)\\"}")
  exit(0)
}

let now = Date()
let past = now.addingTimeInterval(-86400 * lookback)
let future = now.addingTimeInterval(86400 * lookahead)
let cals = store.calendars(for: .event)

// EventKit caps a single predicate at ~4 years; chunk by year to be safe across long ranges.
var allEvents: [EKEvent] = []
var seen = Set<String>()
var chunkStart = past
let chunkSize: TimeInterval = 365 * 86400
while chunkStart < future {
  let chunkEnd = min(chunkStart.addingTimeInterval(chunkSize), future)
  let pred = store.predicateForEvents(withStart: chunkStart, end: chunkEnd, calendars: cals)
  for e in store.events(matching: pred) {
    let id = e.eventIdentifier ?? ""
    let key = id + "|" + (e.startDate?.timeIntervalSince1970.description ?? "")
    if seen.insert(key).inserted { allEvents.append(e) }
  }
  chunkStart = chunkEnd
}

struct Out: Encodable {
  let id: String
  let title: String
  let start: Double?
  let end: Double?
  let location: String
  let calendar: String
  let notes: String
}

let out = allEvents.map { e in
  Out(
    id: e.eventIdentifier ?? "",
    title: e.title ?? "",
    start: e.startDate.map { $0.timeIntervalSince1970 },
    end: e.endDate.map { $0.timeIntervalSince1970 },
    location: e.location ?? "",
    calendar: e.calendar?.title ?? "",
    notes: e.notes ?? ""
  )
}

let data = try JSONEncoder().encode(out)
FileHandle.standardOutput.write(data)
`;
  let raw: string;
  try {
    raw = await runWithStdin(
      "/usr/bin/swift",
      ["-", String(lookbackDays), String(lookaheadDays)],
      Buffer.from(script),
      signal,
      200_000_000,
    );
  } catch (e) {
    lastError = `EventKit/swift failed: ${(e as Error).message}`;
    return null;
  }
  if (!raw.trim()) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    lastError = `EventKit returned non-JSON: ${raw.slice(0, 200)}`;
    return null;
  }
  if (parsed && typeof parsed === "object" && "error" in (parsed as object)) {
    lastError = `Calendar access denied. Grant Raycast access in System Settings → Privacy & Security → Calendars.`;
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  return (
    parsed as Array<{
      id: string;
      title: string;
      start: number | null;
      end: number | null;
      location: string;
      calendar: string;
      notes: string;
    }>
  ).map((e) => ({
    uid: e.id || "",
    summary: e.title,
    description: e.notes || undefined,
    location: e.location || undefined,
    start: e.start !== null ? Math.round(e.start * 1000) : undefined,
    end: e.end !== null ? Math.round(e.end * 1000) : undefined,
    calendar: e.calendar || undefined,
  }));
}

async function discoverIcsFiles(signal: AbortSignal): Promise<string[]> {
  // Try Spotlight first — its index is fast and avoids recursing through every .calendar bundle.
  try {
    const out = await run("mdfind", ["-onlyin", calendarsRoot, 'kMDItemFSName == "*.ics"'], signal, 50_000_000);
    const lines = out.split("\n").filter(Boolean);
    if (lines.length > 0) return lines;
  } catch {
    /* fall through */
  }

  // Fallback: walk the directory directly.
  let calendarDirs: string[];
  try {
    calendarDirs = readdirSync(calendarsRoot)
      .filter((n) => n.endsWith(".calendar"))
      .map((n) => path.join(calendarsRoot, n));
  } catch (e) {
    lastError = `Cannot list ${calendarsRoot}: ${(e as Error).message}. Grant Raycast Full Disk Access.`;
    return [];
  }
  const out: string[] = [];
  for (const cal of calendarDirs) {
    if (signal.aborted) return out;
    const eventsDir = path.join(cal, "Events");
    try {
      for (const f of readdirSync(eventsDir)) {
        if (f.endsWith(".ics")) out.push(path.join(eventsDir, f));
      }
    } catch {
      /* missing Events dir is fine */
    }
  }
  return out;
}

function calendarNameFromIcsPath(icsPath: string): string {
  // …/<UUID>.calendar/Events/<UUID>.ics → walk up to the .calendar dir for Info.plist.
  const eventsDir = path.dirname(icsPath);
  const calendarDir = path.dirname(eventsDir);
  return calendarDisplayName(calendarDir);
}

async function loadAllEvents(signal: AbortSignal): Promise<Event[]> {
  const icsPaths = await discoverIcsFiles(signal);
  if (icsPaths.length === 0) return [];

  const all: Event[] = [];
  for (const full of icsPaths) {
    if (signal.aborted) return [];
    let s;
    try {
      s = statSync(full);
    } catch {
      continue;
    }
    const cached = cache.get(full);
    if (cached && cached.mtime === s.mtimeMs) {
      all.push(...cached.events);
      continue;
    }
    try {
      const text = await readFile(full, "utf8");
      const evs = parseIcs(text, calendarNameFromIcsPath(full));
      cache.set(full, { mtime: s.mtimeMs, events: evs });
      all.push(...evs);
    } catch {
      /* ignore */
    }
  }
  return all;
}

export async function searchEvents(ctx: SourceContext): Promise<SourceOutput> {
  lastError = null;
  const empty = { results: [] as SearchResult[], total: 0 };
  const parsed = parseQuery(ctx.query);
  if (parsed.extensions.length > 0) return empty;
  if (parsed.terms.length === 0) return empty;

  const lookback = (ctx as SourceContext & { lookbackDays?: number }).lookbackDays ?? 30;
  const lookahead = (ctx as SourceContext & { lookaheadDays?: number }).lookaheadDays ?? 90;

  // Prefer EventKit (same source as Spotlight). Fall back to ICS parsing.
  let events: Event[] | null = await loadEventsViaEventKit(lookback, lookahead, ctx.signal);
  if (!events) {
    events = await loadAllEvents(ctx.signal);
    if (events.length > 0) lastError = null;
  }
  if (!events || events.length === 0) return empty;

  const now = Date.now();
  const minT = now - lookback * 24 * 60 * 60 * 1000;
  const maxT = now + lookahead * 24 * 60 * 60 * 1000;

  const matches: SearchResult[] = [];
  const seenOccurrences = new Set<string>();
  for (const e of events) {
    if (e.start !== undefined && (e.start < minT || e.start > maxT)) continue;
    const hay = [e.summary, e.location ?? "", e.description ?? ""].join(" ");
    if (matchesAny(hay, ctx.exclude ?? [])) continue;
    if (!matchesAllTerms(hay, parsed.terms)) continue;
    const startSecsApple = e.start !== undefined ? Math.floor(e.start / 1000) - 978307200 : undefined;
    const occurrenceId = [
      e.uid || e.summary || "(no title)",
      e.start ?? "no-start",
      e.end ?? "no-end",
      e.calendar ?? "",
    ].join(":");
    if (seenOccurrences.has(occurrenceId)) continue;
    seenOccurrences.add(occurrenceId);
    matches.push({
      id: "event:" + occurrenceId,
      kind: "event",
      title: e.summary || "(no title)",
      subtitle: e.calendar,
      url: startSecsApple !== undefined ? `calshow:${startSecsApple}` : "calshow:",
      eventStart: e.start,
      eventEnd: e.end,
      location: e.location,
      calendar: e.calendar,
    });
  }

  matches.sort((a, b) => Math.abs((a.eventStart ?? 0) - now) - Math.abs((b.eventStart ?? 0) - now));
  return { results: matches.slice(0, ctx.limit), total: matches.length };
}
