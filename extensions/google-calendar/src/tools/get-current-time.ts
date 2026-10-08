import { toHumanReadableTime, toISO8601WithTimezoneOffset } from "../lib/utils";

/**
 * Get the current time
 *
 * @remarks
 * Use this tool only if you need to get the current time.
 * Returns the current time in ISO 8601 format with timezone offset (e.g., "2024-06-15T14:30:00-07:00"),
 * which is the recommended format for accurate timezone handling with LLMs.
 * The timezone offset (e.g., -07:00, +02:00) is explicitly included rather than using Z (UTC)
 * to ensure proper timezone interpretation.
 */
const tool = async () => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const now = new Date();
  const iso8601 = toISO8601WithTimezoneOffset(now);
  const humanReadableTime = toHumanReadableTime(now);

  return {
    timezone,
    iso8601,
    humanReadableTime,
  };
};

export default tool;
