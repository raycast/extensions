/** Escapes a value for use inside SQLite single-quoted string literals. */
export function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}
