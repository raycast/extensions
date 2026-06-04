import type { ClassEntry, SpecEntry } from "../types";
import { wowClasses } from "../data/classes";
import { specs } from "../data/specs";
import { startsWithBoundary, removePrefix } from "./text";

export interface MatchResult<T> {
  item: T;
  remainingQuery: string;
}

export function getBestStartMatch<T>(
  normalizedQuery: string,
  entries: Array<{ aliases: string[]; item: T }>,
): MatchResult<T> | null {
  let best: (MatchResult<T> & { aliasLength: number }) | null = null;

  for (const entry of entries) {
    for (const alias of entry.aliases) {
      if (!startsWithBoundary(normalizedQuery, alias)) continue;
      if (!best || alias.length > best.aliasLength) {
        best = {
          item: entry.item,
          remainingQuery: removePrefix(normalizedQuery, alias),
          aliasLength: alias.length,
        };
      }
    }
  }

  return best ? { item: best.item, remainingQuery: best.remainingQuery } : null;
}

export function matchClass(
  normalizedQuery: string,
): MatchResult<ClassEntry> | null {
  return getBestStartMatch(
    normalizedQuery,
    wowClasses.map((c) => ({ aliases: c.aliases, item: c })),
  );
}

export function matchGlobalSpec(
  normalizedQuery: string,
): MatchResult<SpecEntry> | null {
  return getBestStartMatch(
    normalizedQuery,
    specs.map((s) => ({ aliases: s.aliases, item: s })),
  );
}
