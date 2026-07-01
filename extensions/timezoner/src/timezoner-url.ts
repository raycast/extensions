import type { ParsedConversionQuery } from "./types";

export function buildTimeZonerURL(parsed?: ParsedConversionQuery): string {
  if (!parsed) return "timezoner://open";

  const params = [
    ["hour", String(parsed.hour)],
    ["minute", String(parsed.minute)],
    ["zone", parsed.sourceTimezone],
    ["label", parsed.sourceLabel],
  ]
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");

  return `timezoner://set?${params}`;
}
