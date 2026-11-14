import { isMatchableTitle } from "./title-text";

/**
 * Normalize a personal list name for comparison: case and accents are folded, and runs of
 * punctuation or symbols collapse into single spaces.
 *
 * Unicode letters and digits are deliberately preserved. Stripping everything outside
 * `a-z0-9` would map every non-Latin name onto the same empty key, so "日本映画" and
 * "Аниме" would look like duplicates of each other.
 *
 * A name built only from symbols, such as an emoji-only list name, still normalizes to an
 * empty string. Callers must treat that as "fall back to the raw name" rather than as a key
 * that matches anything, which is why the comparisons below are exposed as helpers.
 */
export function normalizeListName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]+/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * Case and accents fold, but emoji and punctuation stay. Used when deciding whether two
 * names are the same list: "🎬 Oscars 2026" and "Oscars 2026 🎬" must not collapse.
 */
export function foldListName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function rawName(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * True when two list names refer to the same list. Used to decide whether a list already
 * exists, so a false positive silently writes into the wrong list.
 */
export function listNameEquals(left: string, right: string): boolean {
  const foldedLeft = foldListName(left);
  const foldedRight = foldListName(right);

  if (!foldedLeft || !foldedRight) {
    return rawName(left) === rawName(right);
  }

  return foldedLeft === foldedRight;
}

/**
 * True when two names share the same letters and digits after punctuation and emoji are
 * stripped. A match here is a near-collision, not proof they are the same list.
 */
export function listNameSimilar(left: string, right: string): boolean {
  const normalizedLeft = normalizeListName(left);
  const normalizedRight = normalizeListName(right);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  return normalizedLeft === normalizedRight;
}

/**
 * True when `name` contains `query`, for partial lookups such as "Oscars" matching
 * "Oscars 2026". An empty query never matches, so it cannot select an arbitrary list.
 */
export function listNameContains(name: string, query: string): boolean {
  const normalizedName = normalizeListName(name);
  const normalizedQuery = normalizeListName(query);

  if (!normalizedQuery || !normalizedName) {
    const raw = rawName(query);
    return raw.length > 0 && rawName(name).includes(raw);
  }

  return normalizedName.includes(normalizedQuery);
}

/**
 * Trakt list IDs are numeric and slugs are lowercase words joined by dashes. The value is
 * inserted into the request path unencoded, so anything else is refused before it can
 * address a different endpoint.
 */
export function assertListId(listId: string | number | undefined): string {
  const value = String(listId ?? "").trim();
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(value)) {
    throw new Error(
      `"${listId ?? ""}" is not a Trakt list ID or slug. Use \`get-lists\` or \`create-list\` to obtain one.`,
    );
  }
  return value;
}

export type ParsedIds = { ids: number[]; invalid: string[] };

/**
 * Parse a comma or semicolon separated list of Trakt IDs. Entries that are not positive
 * integers are returned in `invalid` instead of being dropped silently, so a typo cannot
 * shrink the batch the user approved.
 */
export function parseTraktIds(value?: string): ParsedIds {
  if (!value) return { ids: [], invalid: [] };

  const ids: number[] = [];
  const invalid: string[] = [];

  for (const part of value.split(/[,;]/)) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const id = Number(trimmed);
    if (/^\d+$/.test(trimmed) && Number.isSafeInteger(id) && id > 0) {
      if (!ids.includes(id)) ids.push(id);
    } else {
      invalid.push(trimmed);
    }
  }

  return { ids, invalid };
}

export type SeasonKey = { showTraktId: number; seasonNumber: number };
export type EpisodeKey = SeasonKey & { episodeNumber: number };

function parseKeys<T>(
  value: string | undefined,
  size: number,
  build: (numbers: number[]) => T,
  keyOf: (item: T) => string,
): { keys: T[]; invalid: string[] } {
  if (!value) return { keys: [], invalid: [] };

  const keys: T[] = [];
  const seen = new Set<string>();
  const invalid: string[] = [];

  for (const part of value.split(/[,;]/)) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const pieces = trimmed.split(":").map((piece) => piece.trim());
    const numbers = pieces.map(Number);
    const valid =
      pieces.length === size &&
      pieces.every((piece) => /^\d+$/.test(piece)) &&
      numbers[0] > 0 &&
      numbers.slice(2).every((n) => n > 0);

    if (!valid) {
      invalid.push(trimmed);
      continue;
    }

    const key = build(numbers);
    const id = keyOf(key);
    if (!seen.has(id)) {
      seen.add(id);
      keys.push(key);
    }
  }

  return { keys, invalid };
}

/**
 * Parse "showTraktId:seasonNumber" pairs. Seasons are addressed through their show because
 * Trakt's ID lookup does not resolve season IDs. Season 0 (specials) is allowed.
 */
export function parseSeasonKeys(value?: string): { keys: SeasonKey[]; invalid: string[] } {
  return parseKeys(
    value,
    2,
    ([showTraktId, seasonNumber]) => ({ showTraktId, seasonNumber }),
    (key) => `${key.showTraktId}:${key.seasonNumber}`,
  );
}

/**
 * Parse "showTraktId:seasonNumber:episodeNumber" triples, resolved the same way
 * `mark-episode-watched` resolves an episode.
 */
export function parseEpisodeKeys(value?: string): { keys: EpisodeKey[]; invalid: string[] } {
  return parseKeys(
    value,
    3,
    ([showTraktId, seasonNumber, episodeNumber]) => ({ showTraktId, seasonNumber, episodeNumber }),
    (key) => `${key.showTraktId}:${key.seasonNumber}:${key.episodeNumber}`,
  );
}

export function episodeCode(seasonNumber: number, episodeNumber: number): string {
  return `S${String(seasonNumber).padStart(2, "0")}E${String(episodeNumber).padStart(2, "0")}`;
}

/**
 * Pull a trailing "season N" / "S01E03" off a membership query so title matching stays on the
 * show name while the number filters the list entry. Explicit `seasonNumber` / `episodeNumber`
 * arguments win over anything parsed from the text.
 */
export function resolveListItemQuery(
  query: string | undefined,
  seasonNumber?: number,
  episodeNumber?: number,
): { text: string | undefined; seasonNumber?: number; episodeNumber?: number } {
  if (!query) return { text: undefined, seasonNumber, episodeNumber };

  const trimmed = query.trim();
  const episode = trimmed.match(/^(.*?)\s+S(\d+)E(\d+)\s*$/i);
  if (episode && isMatchableTitle(episode[1])) {
    return {
      text: episode[1].trim(),
      seasonNumber: seasonNumber ?? Number(episode[2]),
      episodeNumber: episodeNumber ?? Number(episode[3]),
    };
  }

  const season = trimmed.match(/^(.*?)\s+season\s*(\d+)\s*$/i);
  if (season && isMatchableTitle(season[1])) {
    return {
      text: season[1].trim(),
      seasonNumber: seasonNumber ?? Number(season[2]),
      episodeNumber,
    };
  }

  return { text: trimmed, seasonNumber, episodeNumber };
}

/**
 * Which list entry types a membership check may count as a hit. A season question only counts
 * season entries: an episode of that season on the list is not the season itself.
 */
export function membershipEntryTypes(
  itemType: "movies" | "shows" | "seasons" | "episodes" | undefined,
  seasonNumber?: number,
  episodeNumber?: number,
): string[] {
  if (itemType === "movies") return ["movie"];
  if (itemType === "shows") return ["show"];
  if (itemType === "seasons") return ["season"];
  if (itemType === "episodes") return ["episode"];
  if (episodeNumber !== undefined) return ["episode"];
  if (seasonNumber !== undefined) return ["season"];
  return ["movie", "show"];
}

/** Join every resolved title for confirmations — never truncate a batch the user is approving. */
export function summarizeLabels(labels: string[]): string {
  return labels.join(", ");
}
