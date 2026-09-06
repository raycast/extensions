import { DocEntry, EntryKind } from "./types";

const KIND_WEIGHT: Record<EntryKind, number> = {
  class: 6,
  event: 5,
  method: 4,
  function: 4,
  exception: 3,
  property: 2,
  attribute: 2,
  data: 1,
  guide: 1,
};

const RESULT_LIMIT = 60;
const BROWSE_LIMIT = 300;

function lastSegment(name: string): string {
  const index = name.lastIndexOf(".");
  return index === -1 ? name : name.slice(index + 1);
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
  if (short.startsWith(term)) return 800;
  if (member.startsWith(term)) return 700;
  if (short.includes(term)) return 500;
  if (isSubsequence(term, short)) return 250;
  return -1;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function startsSegment(haystack: string, token: string): boolean {
  return new RegExp(`(?:^|[._])${escapeRegExp(token)}`).test(haystack);
}

function tokenScore(short: string, member: string, tokens: string[]): number {
  let total = 0;
  for (const token of tokens) {
    let value: number;
    if (member === token) value = 400;
    else if (startsSegment(member, token)) value = 320;
    else if (startsSegment(short, token)) value = 250;
    else if (short.includes(token)) value = 120;
    else return -1;
    total += value;
  }
  return 300 + total / tokens.length;
}

function score(entry: DocEntry, joined: string, tokens: string[]): number {
  const name = entry.name.toLowerCase();
  const short = name.replace(/^discord\./, "");
  const member = lastSegment(name);

  const base = Math.max(
    termScore(short, member, joined),
    tokens.length > 1 ? tokenScore(short, member, tokens) : -1,
  );
  if (base < 0) return -1;

  return base + KIND_WEIGHT[entry.kind] * 4 - Math.min(short.length, 60) / 10;
}

function byProminence(a: DocEntry, b: DocEntry): number {
  return (
    KIND_WEIGHT[b.kind] - KIND_WEIGHT[a.kind] || a.name.localeCompare(b.name)
  );
}

export function browseEntries(
  entries: DocEntry[],
  scoped: boolean,
): DocEntry[] {
  const shown = scoped
    ? entries
    : entries.filter(
        (entry) => entry.kind === "class" || entry.kind === "guide",
      );
  return [...shown]
    .sort(scoped ? (a, b) => a.name.localeCompare(b.name) : byProminence)
    .slice(0, BROWSE_LIMIT);
}

export function searchEntries(entries: DocEntry[], query: string): DocEntry[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  const joined = tokens.join("");

  const scored: { entry: DocEntry; value: number }[] = [];
  for (const entry of entries) {
    const value = score(entry, joined, tokens);
    if (value >= 0) scored.push({ entry, value });
  }

  return scored
    .sort(
      (a, b) => b.value - a.value || a.entry.name.localeCompare(b.entry.name),
    )
    .slice(0, RESULT_LIMIT)
    .map((item) => item.entry);
}

export function membersOf(entries: DocEntry[], parent: DocEntry): DocEntry[] {
  const prefix = `${parent.name}.`;
  return entries
    .filter(
      (entry) =>
        entry.name.startsWith(prefix) &&
        !entry.name.slice(prefix.length).includes("."),
    )
    .sort(byProminence);
}
