// The merge the app's useSearch does (src/lib/use-search.ts in NodebookMD):
// title matches first, then the body hits that are not already listed.
import { match, weight } from "./ranking";
import type { Hit } from "./types";

/** Below this the body search ranks noise, so the title list answers alone. */
export const MIN_BODY_QUERY = 3;

/** Body hits reordered by page kind, as the app does: the node before its shelf button. */
export function rankBodies(hits: Hit[], limit: number): Hit[] {
  const weighted = (hit: Hit) => (hit.score ?? 0) * weight(hit);
  return [...hits].sort((first, second) => weighted(second) - weighted(first)).slice(0, limit);
}

/** Whether a query is a page's whole title plus more words, before or after. */
function names(query: string, title: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const name = title.toLowerCase().split(/\s+/).filter(Boolean);
  if (name.length === 0 || words.length <= name.length) return false;
  const same = (from: number) => name.every((word, i) => words[from + i] === word);
  return same(0) || same(words.length - name.length);
}

export function combine(titles: Hit[], bodies: Hit[], words: string, limit: number): Hit[] {
  const typing = words.toLowerCase();
  // "box size" names the Box page and a thing on it. The body search ranks that page first.
  const lead = titles.some((hit) => hit.title.toLowerCase().startsWith(typing))
    ? undefined
    : bodies.find((hit) => names(words, hit.title));
  const picked = match(titles, words, limit).filter((hit) => hit.path !== lead?.path);
  const seen = new Set(picked.map((hit) => hit.path));
  return [...(lead ? [lead] : []), ...picked, ...bodies.filter((hit) => !seen.has(hit.path) && hit !== lead)];
}
