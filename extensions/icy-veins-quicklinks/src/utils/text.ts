export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

export function titleCase(value: string): string {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

export const capitalize = titleCase;

export function startsWithBoundary(value: string, prefix: string): boolean {
  return value === prefix || value.startsWith(`${prefix} `);
}

export function removePrefix(value: string, prefix: string): string {
  return value === prefix ? "" : value.slice(prefix.length).trimStart();
}
