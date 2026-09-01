import type { Location, ParsedExpression, Resolved } from "../core/types";
import { wallParts } from "../core/time";

/**
 * Rewrites the search text from a resolved state (after a nudge or a re-anchor), so the input always
 * shows what the list is displaying: "lon 13:15", "sf 2026-09-03 9-11". Times are written 24h
 * (unambiguous for the parser); ":00" is dropped.
 */
export function formatExpression(opts: {
  start: number;
  end?: number;
  tz: string;
  now: number;
  parsed: ParsedExpression;
  /** Zone token to keep; undefined means "rely on the dropdown". */
  zoneToken?: string;
}): string {
  const p = wallParts(opts.start, opts.tz);
  const today = wallParts(opts.now, opts.tz);
  // Zone first, time last: the time is what gets edited next, and the cursor lands at the end.
  const parts: string[] = [];
  if (opts.zoneToken) parts.push(opts.zoneToken);
  if (p.y !== today.y || p.m !== today.m || p.d !== today.d) {
    parts.push(`${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`);
  }
  let time = hhmm(p.h, p.min);
  if (opts.end !== undefined) {
    const e = wallParts(opts.end, opts.tz);
    time += `-${hhmm(e.h, e.min)}`;
  }
  parts.push(time);
  return parts.join(" ");
}

function hhmm(h: number, m: number): string {
  return m === 0 ? String(h) : `${h}:${String(m).padStart(2, "0")}`;
}

/** Shortest token that resolves back to this location: a 3-letter alias, else the label. */
export function zoneTokenFor(l: Location): string {
  return l.aliases.find((a) => /^[a-z]{2,4}$/.test(a)) ?? l.label.toLowerCase();
}

/** Zone token to keep when rewriting: what the user typed, or a fixed offset. */
export function currentZoneToken(parsed: ParsedExpression, resolved: Resolved): string | undefined {
  if (parsed.zoneQuery) return parsed.zoneQuery;
  if (parsed.fixedOffset !== undefined) {
    const sign = parsed.fixedOffset < 0 ? "-" : "+";
    const abs = Math.abs(parsed.fixedOffset);
    return `utc${sign}${Math.floor(abs / 60)}${abs % 60 ? ":" + String(abs % 60).padStart(2, "0") : ""}`;
  }
  void resolved;
  return undefined;
}
