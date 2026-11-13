import { ElsewhereNamedItem } from "./state-reader";

export type AiSelectionKind = "space" | "background music track";

function normalizedName(value: string): string {
  return value
    .normalize("NFKD")
    .replaceAll(/\p{Mark}/gu, "")
    .toLocaleLowerCase("en-US")
    .replaceAll(/[^a-z0-9]+/g, "")
    .trim();
}

function availableNames(items: ElsewhereNamedItem[]): string {
  return items.length > 0 ? items.map((item) => item.name).join(", ") : "none";
}

export function resolveNamedItem(
  query: string,
  items: ElsewhereNamedItem[],
  kind: AiSelectionKind,
): ElsewhereNamedItem {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) throw new Error(`Provide the ${kind} name. Available choices: ${availableNames(items)}.`);
  if (items.length === 0) throw new Error(`No ${kind}s are currently available in Elsewhere.`);

  const caseInsensitiveMatches = items.filter(
    (item) => item.name.trim().localeCompare(trimmedQuery, undefined, { sensitivity: "accent" }) === 0,
  );
  if (caseInsensitiveMatches.length === 1) return caseInsensitiveMatches[0];
  if (caseInsensitiveMatches.length > 1) {
    throw new Error(`“${trimmedQuery}” matches multiple ${kind}s. Available choices: ${availableNames(items)}.`);
  }

  const normalizedQuery = normalizedName(trimmedQuery);
  if (!normalizedQuery) throw new Error(`Provide the ${kind} name. Available choices: ${availableNames(items)}.`);

  const normalizedMatches = items.filter((item) => normalizedName(item.name) === normalizedQuery);
  if (normalizedMatches.length === 1) return normalizedMatches[0];
  if (normalizedMatches.length > 1) {
    throw new Error(`“${trimmedQuery}” matches multiple ${kind}s. Available choices: ${availableNames(items)}.`);
  }

  // A unique prefix tolerates concise requests such as “lo-fi” for “Lo-fi Hip-Hop”
  // without allowing arbitrary substring or edit-distance guesses.
  if (normalizedQuery.length >= 3) {
    const prefixMatches = items.filter((item) => normalizedName(item.name).startsWith(normalizedQuery));
    if (prefixMatches.length === 1) return prefixMatches[0];
    if (prefixMatches.length > 1) {
      throw new Error(
        `“${trimmedQuery}” is ambiguous. Matching ${kind}s: ${availableNames(prefixMatches)}. ` +
          `Available choices: ${availableNames(items)}.`,
      );
    }
  }

  throw new Error(`No ${kind} named “${trimmedQuery}” is available. Available choices: ${availableNames(items)}.`);
}
