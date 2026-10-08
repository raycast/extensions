/** Parses "Name#TAG". Riot IDs may contain spaces and non-Latin characters in the name, but never in the tag. */
export function parseRiotId(input: string): { gameName: string; tagLine: string } | undefined {
  const text = input.trim();
  const hash = text.lastIndexOf("#");
  if (hash <= 0) return undefined;

  const gameName = text.slice(0, hash).trim();
  const tagLine = text.slice(hash + 1).trim();
  if (!gameName || !tagLine || /\s/.test(tagLine)) return undefined;
  return { gameName, tagLine };
}
