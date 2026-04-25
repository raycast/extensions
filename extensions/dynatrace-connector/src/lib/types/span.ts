import { z } from "zod";

/**
 * Zod schema for distributed trace span data from Dynatrace
 */
export const spanSchema = z.object({
  trace_id: z.string().describe("Unique trace identifier"),
  span_id: z.string().describe("Unique span identifier within trace"),
  "span.name": z.string().describe("Name of the span operation"),
  "service.name": z.string().describe("Service that executed the span"),
  "span.duration.us": z.number().describe("Span duration in microseconds"),
  status_code: z.enum(["UNSET", "OK", "ERROR"]).describe("Span status"),
  timestamp: z.string().describe("ISO 8601 timestamp of span start"),
});

export type Span = z.infer<typeof spanSchema>;

/**
 * Build DQL query for searching spans
 */
export function buildSpansQuery(
  params: {
    serviceName?: string;
    statusCode?: "ALL" | "OK" | "ERROR";
    minDurationMs?: number;
  } = {},
): string {
  const { serviceName, statusCode, minDurationMs } = params;
  const minDurationUs = minDurationMs ? minDurationMs * 1000 : 0;

  let query = "fetch spans";

  if (serviceName) {
    query += `\n  | filter service.name == "${serviceName}"`;
  }

  if (statusCode && statusCode !== "ALL") {
    query += `\n  | filter status_code == "${statusCode}"`;
  }

  if (minDurationUs > 0) {
    query += `\n  | filter span.duration.us > ${minDurationUs}`;
  }

  query += "\n  | sort timestamp desc\n  | limit 50";

  return query;
}

/**
 * Format duration from microseconds to human-readable string
 */
export function formatDuration(durationUs: number): string {
  if (durationUs < 1000) {
    return `${durationUs}µs`;
  }
  if (durationUs < 1000000) {
    const ms = durationUs / 1000;
    return ms < 1 ? `${durationUs}µs` : `${ms.toFixed(2)}ms`;
  }
  const seconds = durationUs / 1000000;
  return `${seconds.toFixed(2)}s`;
}
