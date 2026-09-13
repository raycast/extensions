import { DocEntry, EntryKind } from "./types";

const KIND_WEIGHT: Record<EntryKind, number> = {
  class: 7,
  interface: 7,
  enum: 6,
  record: 6,
  event: 6,
  exception: 5,
  method: 4,
  annotation: 3,
  package: 3,
  field: 2,
  constant: 2,
  initializer: 1,
  guide: 1,
};

const RESULT_LIMIT = 60;
const BROWSE_LIMIT = 300;

const PACKAGE_PREFIX =
  /^(?:org\.bukkit|io\.papermc\.paper|com\.destroystokyo\.paper|org\.spigotmc)\./;

function afterLastSeparator(value: string): string {
  const hash = value.lastIndexOf("#");
  return value.slice((hash !== -1 ? hash : value.lastIndexOf(".")) + 1);
}

// getRegionScheduler -> get_region_scheduler, so a token search can require a
// word boundary the way it does for the dotted parts of a qualified name.
function segment(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
}

function withoutParameters(value: string): string {
  const open = value.indexOf("(");
  return open === -1 ? value : value.slice(0, open);
}

function isSubsequence(query: string, target: string): boolean {
  if (!query) return true;
  let cursor = 0;
  for (const character of target) {
    if (character === query[cursor]) cursor++;
    if (cursor === query.length) return true;
  }
  return false;
}

function termScore(short: string, member: string, term: string): number {
  if (short === term || member === term) return 1000;
  if (member.startsWith(term)) return 800;
  if (short.startsWith(term)) return 700;
  if (member.includes(term)) return 550;
  if (short.includes(term)) return 500;
  if (isSubsequence(term, member)) return 250;
  return -1;
}

function isSegmentBoundary(code: number): boolean {
  return (
    code === 46 ||
    code === 95 ||
    code === 35 ||
    code === 45 ||
    /\s/.test(String.fromCharCode(code))
  );
}

// Runs for every entry on every keystroke, so it scans with indexOf instead
// of compiling a new RegExp per call.
function startsSegment(haystack: string, token: string): boolean {
  if (haystack.startsWith(token)) return true;
  for (
    let at = haystack.indexOf(token, 1);
    at !== -1;
    at = haystack.indexOf(token, at + 1)
  ) {
    if (isSegmentBoundary(haystack.charCodeAt(at - 1))) return true;
  }
  return false;
}

// A token is matched against both the segmented and the raw form: the segmented
// form makes "region" find getRegionScheduler, the raw one makes "getregion"
// find getRegion, and neither spelling can be assumed to be what was typed.
function tokenValue(indexed: Indexed, token: string): number {
  const { short, member, shortSegments, memberSegments, full } = indexed;

  if (member === token || memberSegments === token) return 400;
  if (startsSegment(memberSegments, token)) return 320;
  if (member.startsWith(token)) return 300;
  if (startsSegment(shortSegments, token)) return 250;
  if (startsSegment(short, token)) return 240;
  if (shortSegments.includes(token) || short.includes(token)) return 120;
  if (startsSegment(full, token)) return 80;
  if (full.includes(token)) return 60;
  return -1;
}

function tokenScore(indexed: Indexed, tokens: string[]): number {
  let total = 0;
  for (const token of tokens) {
    const value = tokenValue(indexed, token);
    if (value < 0) return -1;
    total += value;
  }
  return 300 + total / tokens.length;
}

interface Indexed {
  short: string;
  member: string;
  shortSegments: string;
  memberSegments: string;
  full: string;
  qualified: string;
}

const indexed = new WeakMap<DocEntry, Indexed>();

function index(entry: DocEntry): Indexed {
  const cached = indexed.get(entry);
  if (cached) return cached;

  const built = buildIndex(entry);
  indexed.set(entry, built);
  return built;
}

function buildIndex(entry: DocEntry): Indexed {
  if (entry.kind === "guide") {
    const display = entry.display.toLowerCase();
    const both = `${display} ${entry.pkg.toLowerCase()}`;
    return {
      short: both,
      member: display,
      shortSegments: both,
      memberSegments: display,
      full: both,
      qualified: display,
    };
  }

  // Every field is a slice of one of two strings so the index for ~33,000
  // entries shares their characters instead of holding six copies each.
  const bare = withoutParameters(entry.name);
  const qualified = bare.toLowerCase();
  const full = segment(bare);
  const prefix = PACKAGE_PREFIX.exec(bare)?.[0].length ?? 0;
  return {
    short: qualified.slice(prefix),
    member: afterLastSeparator(qualified),
    shortSegments: full.slice(prefix),
    memberSegments: afterLastSeparator(full),
    full,
    qualified,
  };
}

// A pasted qualified name has to land on the type itself rather than on
// whichever of its members happens to score highest on the package tokens.
function qualifiedScore(qualified: string, dotted: string): number {
  if (qualified === dotted) return 1200;
  return qualified.endsWith(`.${dotted}`) ? 1100 : -1;
}

function score(
  entry: DocEntry,
  joined: string,
  dotted: string,
  tokens: string[],
): number {
  const indexed = index(entry);
  const { short, member, shortSegments, memberSegments, qualified } = indexed;

  const base = Math.max(
    qualifiedScore(qualified, dotted),
    termScore(short, member, joined),
    tokens.length > 1
      ? tokenScore(indexed, tokens)
      : Math.max(
          startsSegment(memberSegments, joined) ? 780 : -1,
          startsSegment(shortSegments, joined) ? 600 : -1,
        ),
  );
  if (base < 0) return -1;

  return base + KIND_WEIGHT[entry.kind] * 4 - Math.min(short.length, 60) / 10;
}

export type IsDeprecated = (entry: DocEntry) => boolean;

const notDeprecated: IsDeprecated = () => false;

// Deprecated entries are pushed after everything else of the same rank instead
// of being excluded, so a browse or member list is not led alphabetically by
// whichever obsolete class happens to start early (co.aikar.timings.* sorts
// before io.papermc/org.bukkit and is almost entirely deprecated).
function byProminence(isDeprecated: IsDeprecated) {
  return (a: DocEntry, b: DocEntry): number =>
    KIND_WEIGHT[b.kind] - KIND_WEIGHT[a.kind] ||
    Number(isDeprecated(a)) - Number(isDeprecated(b)) ||
    a.name.localeCompare(b.name);
}

function isTopLevel(entry: DocEntry): boolean {
  return (
    entry.kind === "guide" ||
    (!entry.owner && entry.kind !== "package" && !entry.display.includes("."))
  );
}

export function browseEntries(
  entries: DocEntry[],
  scoped: boolean,
  isDeprecated: IsDeprecated = notDeprecated,
): DocEntry[] {
  const shown = scoped ? entries : entries.filter(isTopLevel);
  const compare = scoped
    ? (a: DocEntry, b: DocEntry) =>
        Number(isDeprecated(a)) - Number(isDeprecated(b)) ||
        a.name.localeCompare(b.name)
    : byProminence(isDeprecated);
  return [...shown].sort(compare).slice(0, BROWSE_LIMIT);
}

export function searchEntries(entries: DocEntry[], query: string): DocEntry[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  // "Player.getScheduler" and "Player#getScheduler" are how a Java developer
  // writes a member, so the qualifier separators split the query like whitespace.
  const tokens = trimmed.split(/[\s.#]+/).filter(Boolean);
  const joined = tokens.join("");
  const dotted = tokens.join(".");

  const scored: { entry: DocEntry; value: number }[] = [];
  for (const entry of entries) {
    const value = score(entry, joined, dotted, tokens);
    if (value >= 0) scored.push({ entry, value });
  }

  return scored
    .sort(
      (a, b) => b.value - a.value || a.entry.name.localeCompare(b.entry.name),
    )
    .slice(0, RESULT_LIMIT)
    .map((item) => item.entry);
}

export function membersOf(
  entries: DocEntry[],
  parent: DocEntry,
  isDeprecated: IsDeprecated = notDeprecated,
): DocEntry[] {
  const compare = byProminence(isDeprecated);
  if (parent.kind === "package") {
    return entries
      .filter(
        (entry) =>
          entry.pkg === parent.pkg && entry.kind !== "package" && !entry.owner,
      )
      .sort(compare);
  }
  return entries.filter((entry) => entry.owner === parent.name).sort(compare);
}

const memberCounts = new WeakMap<DocEntry[], Map<string, number>>();

function countKey(entry: DocEntry): string | null {
  if (entry.owner) return entry.owner;
  return entry.kind === "package" ? null : `package:${entry.pkg}`;
}

// Every rendered row shows its member count, so the counts are built in one
// pass per entry list instead of running membersOf for each row on each render.
export function memberCount(entries: DocEntry[], parent: DocEntry): number {
  let counts = memberCounts.get(entries);
  if (!counts) {
    counts = new Map();
    for (const entry of entries) {
      const key = countKey(entry);
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    memberCounts.set(entries, counts);
  }
  const key = parent.kind === "package" ? `package:${parent.pkg}` : parent.name;
  return counts.get(key) ?? 0;
}
