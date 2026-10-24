export type ParsedQuery = {
  raw: string;
  doi?: string;
  isbn?: string;
  issn?: string;
};

export function parseQuery(value: string): ParsedQuery {
  const raw = value.trim();
  const doi = raw
    .match(
      /(?:https?:\/\/(?:dx\.)?doi\.org\/)?(10\.\d{4,9}\/[\w.()/:;-]+)/i,
    )?.[1]
    ?.replace(/[),.;]+$/, "")
    .toLowerCase();
  const compact = raw.replace(/[^0-9X]/gi, "").toUpperCase();
  const isbn =
    (compact.length === 10 || compact.length === 13) && isValidIsbn(compact)
      ? compact
      : undefined;
  const issnMatch = raw.match(/(?:ISSN\s*)?(\d{4})-?(\d{3}[\dX])/i);
  const issn = issnMatch
    ? `${issnMatch[1]}-${issnMatch[2].toUpperCase()}`
    : undefined;

  return { raw, doi, isbn, issn };
}

export function normalizeDoi(value?: string): string | undefined {
  return (
    value
      ?.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "")
      .trim()
      .toLowerCase() || undefined
  );
}

function isValidIsbn(value: string): boolean {
  if (value.length === 10) {
    const total = [...value].reduce((sum, character, index) => {
      const digit = character === "X" ? 10 : Number(character);
      return sum + digit * (10 - index);
    }, 0);
    return total % 11 === 0;
  }

  const total = [...value.slice(0, 12)].reduce(
    (sum, character, index) =>
      sum + Number(character) * (index % 2 === 0 ? 1 : 3),
    0,
  );
  return (10 - (total % 10)) % 10 === Number(value[12]);
}
