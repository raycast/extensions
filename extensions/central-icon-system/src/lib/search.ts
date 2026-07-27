/**
 * Icon search: filtering and relevance ranking.
 *
 * Deliberately free of `@raycast/api` imports so it stays unit-testable — the
 * ranking here is what stands in for Raycast's native filtering, so it needs
 * tests more than anything else in the extension.
 */

import type { IconTile } from "../types";

/**
 * Relevance rank for a search hit — lower sorts first.
 *
 * Exists because we filter ourselves rather than letting Raycast do it (see
 * {@link searchTiles}), and a naive `includes()` orders by array position: SF
 * Symbols documented exactly this, where searching "car" surfaced "menucard"
 * ahead of "car". Prefix and exact matches therefore outrank substrings.
 */
function relevance(tile: IconTile, query: string): number {
  const name = tile.name.toLowerCase().replace(/^icon/, "");
  if (name === query) return 0;
  if (name.startsWith(query)) return 1;
  if (tile.keywords.some((k) => k.toLowerCase() === query)) return 2;
  if (tile.keywords.some((k) => k.toLowerCase().startsWith(query))) return 3;
  if (name.includes(query)) return 4;
  return 5;
}

/**
 * Filter and rank tiles for a query, capped at `limit` results.
 *
 * **Why we filter instead of Raycast.** Native filtering ranks better and costs
 * nothing, but it requires handing every tile to the grid — and rendering 4,156
 * `Grid.Item`s re-allocates 4,156 data-URI strings on *every* re-render. That
 * churn outruns the garbage collector: changing the backdrop four times walked
 * RSS from 93 MB to 151 MB and killed the command, and it still climbed with the
 * URI cache disabled and GC forced manually. The only fix is to render fewer
 * tiles, which means filtering before the grid sees them.
 *
 * The cost is accepted deliberately, and the two things that normally make this
 * a bad trade were measured first: our filter runs in ~0.1 ms over 4,156 tiles
 * (not the perf hit SF Symbols hit at 6,404), and {@link relevance} restores the
 * ranking that a bare `includes()` would lose.
 */
export function searchTiles(tiles: IconTile[], query: string, limit: number): { results: IconTile[]; total: number } {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return { results: tiles.slice(0, limit), total: tiles.length };

  const hits: IconTile[] = [];
  for (const tile of tiles) {
    if (tile.name.toLowerCase().includes(trimmed) || tile.keywords.some((k) => k.toLowerCase().includes(trimmed))) {
      hits.push(tile);
    }
  }

  // `total` rides along so the caller can say "showing 300 of 812" instead of
  // silently dropping results, without paying for a second filtering pass.
  const results = hits
    .sort((a, b) => relevance(a, trimmed) - relevance(b, trimmed) || a.name.localeCompare(b.name))
    .slice(0, limit);
  return { results, total: hits.length };
}
