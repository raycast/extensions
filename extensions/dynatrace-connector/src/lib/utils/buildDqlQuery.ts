// src/lib/utils/buildDqlQuery.ts
// Builds a DQL (Dynatrace Query Language) string for log fetching.

export type LogLevel = "error" | "warning" | "info" | "debug" | "fatal" | "all";

/**
 * Escapes special characters in a string for safe interpolation into DQL query strings.
 * Escapes backslashes first, then double quotes.
 */
function escapeDqlString(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

const LOG_LEVEL_MAP: Record<LogLevel, string | null> = {
  error: "ERROR",
  warning: "WARN",
  info: "INFO",
  debug: "DEBUG",
  fatal: "FATAL",
  all: null, // no filter — fetch everything
};

interface BuildDqlOptions {
  logLevel: LogLevel;
  limit?: number;
  /** Server-side filter by service.name (automatically escaped for safety) */
  serviceName?: string;
  /** Server-side full-text search in log content (automatically escaped for safety) */
  contentFilter?: string;
  /** Cursor-based pagination: return records with timestamp < before (ISO string) */
  before?: string;
  /** Optional free-text DQL filter appended as-is. NOT ESCAPED — power-user escape hatch for raw DQL. */
  extraFilter?: string;
}

/**
 * Returns a DQL query string for Dynatrace Grail log search.
 *
 * Example output:
 *   fetch logs
 *   | filter loglevel == "ERROR"
 *   | filter service.name == "my-service"
 *   | filter matchesPhrase(content, "exception")
 *   | sort timestamp desc
 *   | limit 50
 */
export function buildDqlQuery({
  logLevel,
  limit = 50,
  serviceName,
  contentFilter,
  before,
  extraFilter,
}: BuildDqlOptions): string {
  const parts: string[] = ["fetch logs"];

  const level = LOG_LEVEL_MAP[logLevel];
  if (level !== null) {
    parts.push(`filter loglevel == "${level}"`);
  }

  if (serviceName) {
    parts.push(`filter service.name == "${escapeDqlString(serviceName)}"`);
  }

  if (contentFilter) {
    parts.push(`filter matchesPhrase(content, "${escapeDqlString(contentFilter)}")`);
  }

  if (before) {
    parts.push(`filter timestamp < datetime("${before}")`);
  }

  if (extraFilter) {
    parts.push(extraFilter.trim());
  }

  parts.push("sort timestamp desc");
  parts.push(`limit ${limit}`);

  return parts.join(" | ");
}
