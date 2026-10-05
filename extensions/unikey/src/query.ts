import { Fzf, FzfResultItem } from "fzf";
import { Entry, Group, Vault } from "./types";

/**
 * Query syntax (space-separated terms are ANDed):
 *   plain text   → fzf fuzzy match over slug + username + url + group + metadata
 *   pass:term    → slug only
 *   group:term   → group name only
 *   meta:term    → metadata values only
 *   user:term    → username only
 *
 * Prefixed terms use substring matching; plain terms use fzf's
 * typo-tolerant fuzzy algorithm with sensible tiebreakers.
 */

export interface SearchableEntry {
  entry: Entry;
  haystack: string;
}

export function entryHaystack(entry: Entry): string {
  return [
    entry.slug,
    entry.username ?? "",
    entry.url ?? "",
    entry.group ?? "",
    ...Object.values(entry.metadata ?? {}),
  ]
    .filter(Boolean)
    .join(" ");
}

function makeFzf(list: SearchableEntry[]): Fzf<SearchableEntry[]> {
  return new Fzf(list, {
    selector: (item) => item.haystack,
    casing: "smart-case",
  });
}

/** Strict (non-fuzzy) scoring used for prefixed filters. -1 = no match. */
export function scoreTerm(entry: TermTarget, term: string): number {
  let field: "slug" | "group" | "meta" | "user" | null = null;
  if (term.startsWith("pass:")) {
    field = "slug";
    term = term.slice(5);
  } else if (term.startsWith("group:")) {
    field = "group";
    term = term.slice(6);
  } else if (term.startsWith("meta:")) {
    field = "meta";
    term = term.slice(5);
  } else if (term.startsWith("user:")) {
    field = "user";
    term = term.slice(5);
  }
  if (!field || !term) return field ? 0 : -1;

  const t = term.toLowerCase();
  switch (field) {
    case "slug":
      return exactThenPrefixThenSubstring(entry.slug.toLowerCase(), t);
    case "group":
      return (entry.group ?? "").toLowerCase().includes(t) ? 70 : -1;
    case "meta":
      return Object.values(entry.metadata ?? {}).join(" ").toLowerCase().includes(t) ? 50 : -1;
    case "user":
      return (entry.username ?? "").toLowerCase().includes(t) ? 65 : -1;
  }
}

interface TermTarget {
  slug: string;
  group?: string;
  username?: string;
  metadata?: Record<string, string>;
}

function exactThenPrefixThenSubstring(target: string, term: string): number {
  if (target === term) return 100;
  if (target.startsWith(term)) return 80;
  if (target.includes(term)) return 60;
  return -1;
}

/**
 * Main search. Plain-text queries go through fzf for typo tolerance;
 * prefixed terms (pass:, group:, …) gate entries with strict rules.
 */
export function searchEntries(vault: Vault, rawQuery: string): Entry[] {
  const query = rawQuery.trim();

  if (!query) {
    return [...vault.entries].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  let candidates: SearchableEntry[] = vault.entries.map((e) => ({ entry: e, haystack: entryHaystack(e) }));

  const terms = query.split(/\s+/).filter(Boolean);
  const hasPrefix = (t: string) => /^(pass|group|meta|user):/.test(t);

  // Prefixed filters narrow the set first.
  for (const term of terms.filter(hasPrefix)) {
    candidates = candidates.filter((s) => scoreTerm(s.entry, term) >= 0);
  }

  const plainTerms = terms.filter((t) => !hasPrefix(t));
  if (plainTerms.length === 0) {
    return candidates.map((s) => s.entry);
  }

  // Plain terms: fzf per term, intersect results, sum scores.
  let scored = new Map<Entry, number>();
  for (const term of plainTerms) {
    const fzf = makeFzf(candidates);
    const hits = fzf.find(term);
    const termScores = new Map<Entry, number>();
    for (const h of hits as Array<FzfResultItem<SearchableEntry>>) {
      termScores.set(h.item.entry, h.score ?? 0);
    }
    if (scored.size === 0) {
      scored = termScores;
    } else {
      const next = new Map<Entry, number>();
      for (const [entry, prev] of scored) {
        if (termScores.has(entry)) next.set(entry, prev + termScores.get(entry)!);
      }
      scored = next;
    }
    if (scored.size === 0) break;
  }

  return [...scored.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].slug.localeCompare(b[0].slug))
    .map(([entry]) => entry);
}

export function groupsSorted(vault: Vault): Group[] {
  return [...vault.groups].sort((a, b) => a.name.localeCompare(b.name));
}

export function entriesInGroup(vault: Vault, groupName: string | undefined): Entry[] {
  return vault.entries
    .filter((e) => e.group === groupName)
    .sort((a, b) => a.slug.localeCompare(b.slug));
}
