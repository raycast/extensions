import { executeToolCall, toolTraktClient } from "./tool-client";

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
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
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
  const normalizedLeft = normalizeListName(left);
  const normalizedRight = normalizeListName(right);

  if (!normalizedLeft || !normalizedRight) {
    return rawName(left) === rawName(right);
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
 * Parse a comma or semicolon separated list of Trakt IDs, dropping anything that is not a
 * positive integer and removing duplicates.
 */
export function parseTraktIds(value?: string): number[] {
  if (!value) return [];

  const ids = value
    .split(/[,;]/)
    .map((part) => Number(part.trim()))
    .filter((id) => Number.isInteger(id) && id > 0);

  return [...new Set(ids)];
}

/**
 * Resolve the name Trakt holds for a list ID or slug, so a confirmation names the list that
 * will actually be written rather than a label supplied by the caller. Throws when the list
 * does not exist, which blocks the write.
 */
export async function describeList(listId: string): Promise<string> {
  const response = await executeToolCall(
    (signal) =>
      toolTraktClient.users.getLists({
        params: { id: "me" },
        fetchOptions: { signal },
      }),
    "Failed to look up your Trakt personal lists",
  );

  const target = String(listId);
  const match = response.body.find((list) => String(list.ids.trakt) === target || list.ids.slug === target);

  if (!match) {
    throw new Error(
      `No personal list matches "${listId}". Use \`get-lists\` to obtain a valid list ID before writing.`,
    );
  }

  return match.name;
}
