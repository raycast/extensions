/**
 * JQL safety helpers + small composable builder.
 *
 * Design principles:
 * - Identifiers (e.g. project keys) should be allowlisted, not escaped.
 * - String literals must be quoted and have quotes/backslashes escaped.
 * - Builders return strings and are easy to compose.
 */

/** Jira project keys are simple identifiers (e.g. "ABC", "abc_123"). */
const JQL_IDENTIFIER_RE = /^[A-Z][A-Z0-9_]*$/i;

export function sanitizeJqlIdentifier(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return JQL_IDENTIFIER_RE.test(trimmed) ? trimmed : undefined;
}

/** Wrap a value in double quotes. */
export function quoteJqlString(value: string): string {
  // Jira supports backslash escaping within quoted strings.
  const escaped = value.replace(/[\\"]/g, "\\$&");
  return `"${escaped}"`;
}

/** Wrap a clause in parentheses. */
export function group(clause: string): string {
  return `(${clause})`;
}

/** Join non-empty clauses with AND. */
export function and(...clauses: Array<string | undefined | null | false>): string {
  const parts = clauses.filter(Boolean) as string[];
  if (parts.length === 0) return "";
  return parts.join(" AND ");
}

/** Join non-empty clauses with OR. */
export function or(...clauses: Array<string | undefined | null | false>): string {
  const parts = clauses.filter(Boolean) as string[];
  if (parts.length === 0) return "";
  return parts.join(" OR ");
}

/** Field equals an allowlisted identifier (e.g. project = ABC). */
export function eqIdentifier(field: string, value: string | undefined | null): string | undefined {
  const ident = sanitizeJqlIdentifier(value);
  if (!ident) return undefined;
  return `${field} = ${ident}`;
}

/** Field equals a quoted string (e.g. project = "ABC"). */
export function eqString(field: string, value: string): string {
  return `${field} = ${quoteJqlString(value)}`;
}

/** Field fuzzy-matches a quoted string (e.g. text ~ "foo"). */
export function containsText(field: string, value: string): string {
  return `${field} ~ ${quoteJqlString(value)}`;
}

/**
 * Inject `AND project = <KEY>` into a JQL string safely.
 * If `projectKey` is missing or invalid, returns the original JQL unchanged.
 */
export function withProjectFilter(jql: string, projectKey: string | undefined | null): string {
  const key = sanitizeJqlIdentifier(projectKey);
  if (!key) return jql;

  const orderIdx = jql.indexOf(" ORDER BY ");
  if (orderIdx === -1) {
    return `${jql} AND project = ${key}`;
  }
  return `${jql.slice(0, orderIdx)} AND project = ${key}${jql.slice(orderIdx)}`;
}
