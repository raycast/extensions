import { findCalibers, listCalibers, normalizeCaliber } from "gunsnprices";
import type { Caliber } from "gunsnprices";
import { CALIBER_DATA } from "./caliber-data.ts";

export interface CaliberEntry extends Caliber {
  /** other spellings seen in store listings, e.g. "9mm Luger (9x19)" */
  spellings: string[];
  /** number of listings on GunsNPrices when the data was built; used to rank results */
  listings: number;
  typeLabel: string;
}

const TYPE_LABELS: Record<Caliber["type"], string> = {
  handgun: "Handgun",
  rifle: "Rifle",
  rimfire: "Rimfire",
  shotgun: "Shotgun",
  airgun: "Airgun",
  muzzleloader: "Muzzleloader",
};

let all: CaliberEntry[] | null = null;
let byId: Map<string, CaliberEntry> | null = null;

/** Every caliber, most common first. */
export function allCalibers(): CaliberEntry[] {
  if (all) return all;
  all = listCalibers()
    .map((c) => ({
      ...c,
      spellings: CALIBER_DATA[c.id]?.spellings ?? [],
      listings: CALIBER_DATA[c.id]?.listings ?? 0,
      typeLabel: TYPE_LABELS[c.type] ?? c.type,
    }))
    .sort((a, b) => b.listings - a.listings || a.name.localeCompare(b.name));
  byId = new Map(all.map((c) => [c.id, c]));
  return all;
}

function entry(id: string): CaliberEntry | undefined {
  allCalibers();
  return byId?.get(id);
}

/** Lower case, "×" as "x", no spaces, dots, dashes or underscores: ".300 AAC Blackout" -> "300aacblackout". */
export function compact(s: string): string {
  return s
    .toLowerCase()
    .replace(/×/g, "x")
    .replace(/[\s._-]/g, "");
}

/**
 * Calibers matching a search: first the caliber the whole query normalizes to ("9mm Luger" -> 9×19mm Parabellum),
 * then calibers mentioned in it, then name and store-spelling matches, each group most common first.
 */
export function searchCalibers(query: string): CaliberEntry[] {
  const q = query.trim();
  const list = allCalibers();
  if (!q) return list;
  const score = new Map<string, number>();
  const offer = (id: string, s: number): void => {
    const prev = score.get(id);
    if (prev === undefined || s < prev) score.set(id, s);
  };
  const exact = normalizeCaliber(q);
  if (exact) offer(exact.id, 0);
  findCalibers(q).forEach((c, i) => offer(c.id, 1 + i / 100));
  const cq = compact(q);
  if (cq) {
    for (const c of list) {
      const name = compact(c.name);
      const spellings = c.spellings.map(compact);
      if (name === cq) offer(c.id, 0.5);
      else if (name.startsWith(cq)) offer(c.id, 2);
      else if (spellings.some((s) => s === cq)) offer(c.id, 2.5);
      else if (name.includes(cq)) offer(c.id, 3);
      else if (spellings.some((s) => s.startsWith(cq))) offer(c.id, 4);
      else if (spellings.some((s) => s.includes(cq))) offer(c.id, 5);
    }
  }
  return [...score.entries()]
    .map(([id, s]) => ({ c: entry(id), s }))
    .filter((x): x is { c: CaliberEntry; s: number } => x.c !== undefined)
    .sort((a, b) => a.s - b.s || b.c.listings - a.c.listings || a.c.name.localeCompare(b.c.name))
    .map((x) => x.c);
}

function code(s: string): string {
  return "`" + s.replace(/`/g, "'") + "`";
}

/** Markdown for the detail pane. */
export function caliberMarkdown(c: CaliberEntry): string {
  const lines = [`# ${c.name}`, "", `**Type:** ${c.typeLabel}`];
  if (c.spellings.length) {
    lines.push("", "**Also written as:** " + c.spellings.map(code).join(", "));
  }
  return lines.join("\n");
}
