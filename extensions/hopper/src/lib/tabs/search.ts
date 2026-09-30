// PURE: filtering and ranking tabs for the search bar (Raycast's own filter is turned off; ADR-015).
//
// Fuse.js fuzzy search: every query word must match some field, typos are forgiven ("caude" and "cluade" find
// "Claude"), and the app's name weighs most, so typing an app's name brings that app's own tabs first, ahead of
// browser tabs that merely mention it.

import Fuse from "fuse.js";
import type { Tab } from "./model";

const KEYS = [
  { name: "app.name", weight: 5 },
  { name: "title", weight: 2 },
  { name: "detail", weight: 1 },
  { name: "detailFull", weight: 1 },
  { name: "url", weight: 1 },
  { name: "kind", weight: 0.5 },
];

/** The fields search looks at: open tabs, Recently Closed entries, and agents (kind "agent", detail their product). */
export type Searchable = Pick<Tab, "title" | "detail" | "url"> & { kind: string; app: Pick<Tab["app"], "name"> };

/** Tabs matching every word of `query`, best match first; ties keep the input order (recency). */
export function searchTabs<T extends Searchable>(tabs: T[], query: string): T[] {
  if (!query.trim()) return tabs;
  const fuse = new Fuse(tabs, {
    keys: KEYS,
    threshold: 0.35,
    ignoreLocation: true,
    useTokenSearch: true,
    tokenMatch: "all",
  });
  return fuse.search(query).map((r) => r.item);
}

/**
 * Next / Previous App (⌥→ / ⌥←): the first row of the section after (`step` 1) or before (-1) the one holding
 * `current`, sections given as their rows' ids. Sections are in recency order, and so are an app's rows, so this
 * is the next older / newer app's most recent row. Stays put at either end; from no known row, → goes to the top.
 */
export function adjacentSection(sections: string[][], current: string | undefined, step: 1 | -1): string | undefined {
  const filled = sections.filter((rows) => rows.length > 0);
  const at = filled.findIndex((rows) => current !== undefined && rows.includes(current));
  return filled[at + step]?.[0] ?? current;
}
