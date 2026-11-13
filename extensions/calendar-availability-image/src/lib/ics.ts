import ICAL from "ical.js";
import { BusyEvent } from "./types";

const MAX_ITERATIONS = 50000;

export function parseBusyEvents(icsText: string, rangeStart: Date, rangeEnd: Date): BusyEvent[] {
  const vcal = new ICAL.Component(ICAL.parse(icsText));

  for (const tz of vcal.getAllSubcomponents("vtimezone")) {
    ICAL.TimezoneService.register(tz);
  }

  const vevents = vcal.getAllSubcomponents("vevent");
  registerIanaTimezones(vevents);

  const masters: ICAL.Event[] = [];
  const mastersByUid = new Map<string, ICAL.Event[]>();
  const exceptions: ICAL.Event[] = [];
  const singles: ICAL.Event[] = [];

  for (const comp of vevents) {
    const ev = new ICAL.Event(comp);
    if (ev.isRecurrenceException()) exceptions.push(ev);
    else if (ev.isRecurring()) {
      masters.push(ev);
      mastersByUid.set(ev.uid, [...(mastersByUid.get(ev.uid) ?? []), ev]);
    } else singles.push(ev);
  }

  const related: ICAL.Event[] = [];
  for (const ex of exceptions) {
    const owners = mastersByUid.get(ex.uid);
    if (owners) {
      for (const master of owners) master.relateException(ex);
      related.push(ex);
    } else singles.push(ex);
  }

  const out: BusyEvent[] = [];
  const from = rangeStart.getTime();
  const to = rangeEnd.getTime();

  const push = (item: ICAL.Event, start: ICAL.Time, end: ICAL.Time) => {
    const kind = blockingKind(item);
    if (kind === "free") return;
    const allDay = start.isDate;
    const s = toLocalMs(start);
    let e = toLocalMs(end);
    if (e <= s) e = allDay ? s + 24 * 3600 * 1000 : s + 60 * 1000;
    if (e <= from || s >= to) return;
    out.push({ start: s, end: e, tentative: kind === "tentative", allDay });
  };

  for (const ev of singles) {
    if (!ev.startDate) continue;
    push(ev, ev.startDate, ev.endDate ?? ev.startDate);
  }

  for (const ev of masters) {
    if (!ev.startDate) continue;
    // Without an RRULE the iterator only yields the RDATE values, so DTSTART has to be added here.
    if (!ev.component.hasProperty("rrule") && !isExcluded(ev, ev.startDate)) {
      const occ = ev.getOccurrenceDetails(ev.startDate);
      push(occ.item, occ.startDate, occ.endDate);
    }
    const it = ev.iterator();
    let next: ICAL.Time | null;
    let n = 0;
    while ((next = it.next()) && n++ < MAX_ITERATIONS) {
      if (toLocalMs(next) >= to) break;
      const occ = ev.getOccurrenceDetails(next);
      push(occ.item, occ.startDate, occ.endDate);
    }
  }

  // The loop above stops at the original date of an occurrence, so it never reaches
  // exceptions that were moved into the range from after its end.
  for (const ex of related) {
    if (!ex.startDate || !ex.recurrenceId) continue;
    if (toLocalMs(ex.recurrenceId) >= to) push(ex, ex.startDate, ex.endDate ?? ex.startDate);
  }

  return out.sort((a, b) => a.start - b.start);
}

function isExcluded(ev: ICAL.Event, time: ICAL.Time): boolean {
  return ev.component
    .getAllProperties("exdate")
    .flatMap((p) => p.getValues() as ICAL.Time[])
    .some((ex) => ex.compare(time) === 0);
}

/**
 * Some feeds reference IANA time zones without shipping a VTIMEZONE block. ical.js would read
 * those times as local time, so resolve them through Intl instead. Unknown names stay local time.
 */
function registerIanaTimezones(vevents: ICAL.Component[]) {
  for (const comp of vevents) {
    for (const prop of comp.getAllProperties()) {
      const tzid = prop.getParameter("tzid");
      if (typeof tzid !== "string" || ICAL.TimezoneService.has(tzid)) continue;
      const format = ianaFormat(tzid);
      if (format) ICAL.TimezoneService.register(new IntlTimezone(tzid, format), tzid);
    }
  }
}

function ianaFormat(tzid: string): Intl.DateTimeFormat | null {
  if (!tzid.includes("/")) return null;
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tzid,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
  } catch {
    return null;
  }
}

class IntlTimezone extends ICAL.Timezone {
  private readonly format: Intl.DateTimeFormat;

  constructor(tzid: string, format: Intl.DateTimeFormat) {
    super({ tzid });
    this.format = format;
  }

  /** Offset from UTC in seconds for a wall-clock time in this zone. */
  utcOffset(tt: ICAL.Time): number {
    const wall = Date.UTC(tt.year, tt.month - 1, tt.day, tt.hour, tt.minute, tt.second);
    const guess = this.offsetAt(wall);
    // Around a daylight saving change the first guess can be off, so check it against the resulting instant.
    return this.offsetAt(wall - guess * 1000);
  }

  private offsetAt(utcMs: number): number {
    const f: Record<string, number> = {};
    for (const part of this.format.formatToParts(new Date(utcMs))) {
      if (part.type !== "literal") f[part.type] = Number(part.value);
    }
    const asUtc = Date.UTC(f.year, f.month - 1, f.day, f.hour, f.minute, f.second);
    return Math.round((asUtc - Math.floor(utcMs / 1000) * 1000) / 1000);
  }
}

/** All-day events apply to the local calendar day, not to the UTC day. */
function toLocalMs(t: ICAL.Time): number {
  if (t.isDate) return new Date(t.year, t.month - 1, t.day).getTime();
  return t.toJSDate().getTime();
}

function blockingKind(ev: ICAL.Event): "busy" | "tentative" | "free" {
  const c = ev.component;
  const status = String(c.getFirstPropertyValue("status") ?? "").toUpperCase();
  if (status === "CANCELLED") return "free";

  const ms = String(c.getFirstPropertyValue("x-microsoft-cdo-busystatus") ?? "").toUpperCase();
  if (ms === "FREE" || ms === "WORKINGELSEWHERE") return "free";
  if (ms === "TENTATIVE") return "tentative";
  if (ms === "BUSY" || ms === "OOF") return "busy";

  const transp = String(c.getFirstPropertyValue("transp") ?? "").toUpperCase();
  if (transp === "TRANSPARENT") return "free";
  if (status === "TENTATIVE") return "tentative";
  return "busy";
}
