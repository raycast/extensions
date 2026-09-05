function stripControlCharacters(value: string): string {
  return [...value]
    .filter((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code >= 32 && code !== 127;
    })
    .join("");
}

/** Backslashes are escaped before quotes, or a trailing backslash escapes the closing delimiter. */
export function literal(value: string): string {
  const cleaned = stripControlCharacters(value);
  return `'${cleaned.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

export function asEntityId(query: string): number | null {
  const trimmed = query.trim();
  if (!/^\d{1,12}$/.test(trimmed)) return null;
  const id = Number(trimmed);
  return id > 0 ? id : null;
}

/** The bare boolean `eq false` is a 400; the parser wants it quoted like any other literal. */
const NOT_FINAL = "(EntityState.IsFinal eq 'false')";

function and(...clauses: (string | null)[]): string {
  return clauses.filter((clause): clause is string => clause !== null).join(" and ");
}

export interface SearchOptions {
  includeFinal?: boolean;
}

export function searchWhere(term: string, options: SearchOptions = {}): string {
  return and(`(Name contains ${literal(term.trim())})`, options.includeFinal ? null : NOT_FINAL);
}

/** No final-state clause: an exact ID should resolve whether or not it is closed. */
export function idWhere(id: number): string {
  return `(Id eq ${id})`;
}

export function assignedToWhere(userId: number, options: SearchOptions = {}): string {
  return and(`(AssignedUser.Id eq ${userId})`, options.includeFinal ? null : NOT_FINAL);
}
