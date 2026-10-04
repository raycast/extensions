import type { Filter, NostrEvent, Person } from "./types";

/** Default number of profiles a directory search asks the relay for. */
const SEARCH_LIMIT = 20;

/**
 * The slice of `BuzzClient` a directory search needs. Depending on the method
 * rather than the class keeps this module testable without a relay, and mirrors
 * how the rest of `src/lib` stays free of Raycast and network specifics.
 */
export interface ProfileSource {
  query(filters: Filter[]): Promise<NostrEvent[]>;
}

/** How a pubkey is shown when we have no name for it, matching message rows. */
export function shortenPubkey(pubkey: string): string {
  return pubkey.slice(0, 8);
}

/**
 * A display name from NIP-01 kind:0 profile content, or "" when there is none.
 * `display_name` is what Buzz's own clients prefer, with `name` as the fallback.
 */
export function profileName(content: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return "";
  }
  if (typeof parsed !== "object" || parsed === null) return "";

  const profile = parsed as { display_name?: unknown; name?: unknown };
  for (const candidate of [profile.display_name, profile.name]) {
    if (typeof candidate === "string" && candidate.trim() !== "") return candidate.trim();
  }
  return "";
}

export function toPerson(event: NostrEvent): Person {
  return { pubkey: event.pubkey, name: profileName(event.content) || shortenPubkey(event.pubkey) };
}

/**
 * Kind 0 is replaceable, so a relay should return one profile per author, but
 * nothing guarantees it. Collapsing here keeps duplicate rows (with the same
 * React key) out of the list. A tie keeps the first seen, since with equal
 * timestamps there is no basis to prefer the later one.
 */
export function newestPerAuthor(events: NostrEvent[]): NostrEvent[] {
  const newest = new Map<string, NostrEvent>();
  for (const event of events) {
    const previous = newest.get(event.pubkey);
    if (previous === undefined || event.created_at > previous.created_at) {
      newest.set(event.pubkey, event);
    }
  }
  return [...newest.values()];
}

/**
 * Search people and agents by name. Agents carry ordinary kind:0 profiles, so
 * one NIP-50 query covers both; there is deliberately no second query against
 * the managed-agent kind, which is owner-scoped and would only list our own.
 *
 * An empty query returns nothing without touching the relay: a directory has no
 * useful "everything" state, and NIP-50 needs a term.
 */
export async function searchPeople(source: ProfileSource, query: string, limit = SEARCH_LIMIT): Promise<Person[]> {
  const term = query.trim();
  if (term === "") return [];
  const events = await source.query([{ kinds: [0], search: term, limit }]);
  return newestPerAuthor(events).map(toPerson);
}
