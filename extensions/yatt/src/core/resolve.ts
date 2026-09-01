import type { DateSpec, Location, ParsedExpression, Resolved, ZoneTarget } from "./types";
import type { ZoneInfo } from "./dataset";
import { fold } from "./text";
import { daysInMonth, fixedOffsetZone, isValidZone, wallParts, wallToInstant } from "./time";

export type ResolveContext = {
  now: number;
  locations: Location[];
  zones: ZoneInfo[];
  /** Anchor used when the expression names no zone (dropdown / preference). */
  fallback: ZoneTarget;
  dateOrder: "dmy" | "mdy";
  /** Lazy lookup in the bundled dataset for zone tokens matching no configured location. */
  lookup?: (query: string) => ZoneTarget | undefined;
};

type Scored = { location: Location; score: number };

/**
 * Scores configured locations against a zone query. 3 = exact (alias, code, abbreviation, IANA name, full label),
 * 2 = label prefix, 1 = word prefix inside the label.
 */
export function matchLocations(query: string, locations: Location[], zones: ZoneInfo[]): Scored[] {
  const q = fold(query);
  if (!q) return [];
  const qUpper = query.trim().toUpperCase();
  const zoneByName = new Map(zones.map((z) => [z.name, z]));
  const out: Scored[] = [];
  for (const location of locations) {
    const label = fold(location.label);
    let score = 0;
    if (label === q || location.aliases.some((a) => fold(a) === q)) score = 3;
    else if (location.tz.toLowerCase() === query.trim().toLowerCase()) score = 3;
    else {
      const z = zoneByName.get(location.tz);
      if (z && (z.abbr.includes(qUpper) || (location.tz === "UTC" && ["Z", "ZULU", "GMT"].includes(qUpper)))) score = 3;
      else if (z && q.length >= 4 && fold(z.long).startsWith(q)) score = 2;
      else if (label.startsWith(q)) score = 2;
      else if (label.split(" ").some((w) => w.startsWith(q)) || location.aliases.some((a) => fold(a).startsWith(q)))
        score = 1;
    }
    if (score) out.push({ location, score });
  }
  return out.sort((a, b) => b.score - a.score);
}

/** Resolves a zone query outside the configured list: fixed offsets, IANA names, abbreviations, long names. */
export function matchZone(query: string, zones: ZoneInfo[]): ZoneTarget | undefined {
  const raw = query.trim();
  const upper = raw.toUpperCase();
  if (["UTC", "Z", "ZULU", "GMT"].includes(upper)) return zoneTarget("UTC", "UTC", raw);
  const iana = zones.find((z) => z.name.toLowerCase() === raw.toLowerCase());
  if (iana) return zoneTarget(iana.name, iana.long === iana.name ? iana.name : `${iana.long}`, raw);
  if (raw.includes("/") && isValidZone(raw)) return zoneTarget(raw, raw, raw);
  if (/^[A-Z]{2,5}$/.test(upper)) {
    const hits = zones.filter((z) => z.abbr.includes(upper) && z.canonical === z.name);
    if (hits.length) {
      // en-US usage first ("CST" → not Asia/Shanghai), any English locale second ("BST" → London, not Dhaka),
      // CLDR golden zone third ("CST" → Chicago, not Mexico City; "EST" → New York, not Toronto), people served last ("IST" → Kolkata).
      const rank = (z: ZoneInfo) =>
        (z.primary?.includes(upper) ? 1e13 : 0) +
        (z.intl?.includes(upper) ? 1e12 : 0) +
        (z.golden ? 1e11 : 0) +
        (z.pop ?? 0);
      hits.sort((a, b) => rank(b) - rank(a));
      return zoneTarget(hits[0].name, `${hits[0].long} (${upper})`, raw);
    }
  }
  const q = fold(raw);
  if (q.length >= 4) {
    const long = zones.filter((z) => z.canonical === z.name && fold(z.long).startsWith(q));
    long.sort((a, b) => (b.golden ? 1e11 : 0) + (b.pop ?? 0) - ((a.golden ? 1e11 : 0) + (a.pop ?? 0)));
    if (long.length) return zoneTarget(long[0].name, long[0].long, raw);
  }
  return undefined;
}

/** A zone anchor outside the configured list. `token` is what the user typed, kept as an alias so re-anchoring can rewrite it. */
export function zoneTarget(tz: string, label: string, token?: string): ZoneTarget {
  const transient: Location = { id: `tz:${tz}`, kind: "zone", label, tz, aliases: token ? [token.toLowerCase()] : [] };
  return { tz, label, transient };
}

function resolveDate(spec: DateSpec | undefined, now: number, tz: string, dateOrder: "dmy" | "mdy") {
  const today = wallParts(now, tz);
  const base = { y: today.y, m: today.m, d: today.d };
  if (!spec || spec.kind === "today") return base;
  if (spec.kind === "tomorrow") return shift(base, 1);
  if (spec.kind === "weekday") return shift(base, (spec.weekday - today.weekday + 7) % 7);
  let m: number;
  let d: number;
  let y: number | undefined;
  if (spec.kind === "ymd") {
    m = spec.m;
    d = spec.d;
    y = spec.y;
  } else if (spec.kind === "md") {
    m = spec.m;
    d = spec.d;
  } else {
    m = dateOrder === "dmy" ? spec.b : spec.a;
    d = dateOrder === "dmy" ? spec.a : spec.b;
    y = spec.y;
  }
  if (m < 1 || m > 12 || d < 1) return null;
  if (y === undefined) {
    y = today.y;
    // Past dates roll into next year (asking for "3 Jan" in December means the coming January).
    if (m < today.m || (m === today.m && d < today.d)) y += 1;
  }
  if (d > daysInMonth(y, m)) return null;
  return { y, m, d };
}

function shift(base: { y: number; m: number; d: number }, days: number) {
  const t = Date.UTC(base.y, base.m - 1, base.d + days);
  const x = new Date(t);
  return { y: x.getUTCFullYear(), m: x.getUTCMonth() + 1, d: x.getUTCDate() };
}

export function resolve(parsed: ParsedExpression, ctx: ResolveContext): Resolved {
  const errors = [...parsed.errors];
  let anchor: ZoneTarget = ctx.fallback;
  let ambiguous: Location[] = [];
  let date = parsed.date;

  // A weekday word that is also a configured code ("sat" for San Antonio) means the location, not the day.
  let zoneQuery = parsed.zoneQuery;
  if (parsed.dateToken && !zoneQuery) {
    const exact = matchLocations(parsed.dateToken, ctx.locations, ctx.zones).filter((h) => h.score === 3);
    if (exact.length) {
      zoneQuery = parsed.dateToken;
      date = undefined;
    }
  }

  if (parsed.fixedOffset !== undefined) {
    const tz = fixedOffsetZone(parsed.fixedOffset);
    if (tz) anchor = zoneTarget(tz, `UTC${parsed.fixedOffset >= 0 ? "+" : "−"}${Math.abs(parsed.fixedOffset) / 60}`);
    else errors.push("unsupported offset");
    if (zoneQuery) errors.push("one zone at a time");
  }
  if (zoneQuery && parsed.fixedOffset === undefined) {
    const hits = matchLocations(zoneQuery, ctx.locations, ctx.zones);
    if (hits.length) {
      anchor = { tz: hits[0].location.tz, label: hits[0].location.label, location: hits[0].location };
      ambiguous = hits
        .slice(1)
        .filter((h) => h.score === hits[0].score)
        .map((h) => h.location);
    } else {
      const z = matchZone(zoneQuery, ctx.zones) ?? ctx.lookup?.(zoneQuery);
      if (z) anchor = z;
      else {
        // "lon utc": every word is a zone on its own → say so instead of "unknown place".
        const words = zoneQuery.split(" ");
        const eachIsZone =
          words.length > 1 &&
          words.every(
            (w) => matchLocations(w, ctx.locations, ctx.zones).some((h) => h.score === 3) || matchZone(w, ctx.zones),
          );
        errors.push(eachIsZone ? "one zone at a time" : `unknown place "${zoneQuery}"`);
      }
    }
  }

  const resolvedDate = resolveDate(date, ctx.now, anchor.tz, ctx.dateOrder);
  if (!resolvedDate) errors.push("invalid date");
  const day = resolvedDate ?? resolveDate(undefined, ctx.now, anchor.tz, ctx.dateOrder)!;

  let live = false;
  let start: number;
  if (parsed.start) start = wallToInstant(anchor.tz, day.y, day.m, day.d, parsed.start.h, parsed.start.m);
  else if (date && resolvedDate) {
    const nowWall = wallParts(ctx.now, anchor.tz);
    start = wallToInstant(anchor.tz, day.y, day.m, day.d, nowWall.h, nowWall.min);
  } else {
    start = ctx.now;
    live = true;
  }

  let end: number | undefined;
  if (parsed.end && parsed.start) {
    // Wrap to the next day by wall-clock order ("22-2"), not by instant: a DST gap can collapse both to one instant.
    const wraps = parsed.end.h * 60 + parsed.end.m <= parsed.start.h * 60 + parsed.start.m;
    end = wallToInstant(anchor.tz, day.y, day.m, day.d + (wraps ? 1 : 0), parsed.end.h, parsed.end.m);
  } else if (parsed.duration !== undefined) {
    end = start + parsed.duration * 60000;
  }
  return { anchor, start, end, live, ambiguous, errors };
}
