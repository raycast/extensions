import { RateLimit } from "./types";

export const WEEKLY_SEARCH_POLICY = "search-weekly";

/**
 * Parses the IETF RateLimit header Savee sends, for example:
 * "burst";r=59;t=60, "search-weekly";r=180;t=432000
 */
export function parseRateLimit(header: string | null | undefined): RateLimit[] {
  if (!header) {
    return [];
  }

  return header
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .flatMap((entry) => {
      const [rawPolicy, ...params] = entry.split(";").map((part) => part.trim());
      const policy = rawPolicy.replace(/^"|"$/g, "");
      const values = Object.fromEntries(
        params.map((param) => {
          const [key, value] = param.split("=");
          return [key, Number(value)];
        }),
      );

      if (!policy || !Number.isFinite(values.r)) {
        return [];
      }

      return [{ policy, remaining: values.r, resetSeconds: Number.isFinite(values.t) ? values.t : 0 }];
    });
}

export function getRemaining(rateLimits: RateLimit[], policy: string): number | undefined {
  return rateLimits.find((rateLimit) => rateLimit.policy === policy)?.remaining;
}

export function describeSearchesLeft(remaining: number | undefined): string | undefined {
  if (remaining === undefined) {
    return undefined;
  }

  return remaining === 1 ? "1 search left this week" : remaining + " searches left this week";
}

export function formatWait(seconds: number | undefined): string {
  if (!seconds || seconds <= 0) {
    return "in a moment";
  }

  if (seconds < 60) {
    return "in " + Math.ceil(seconds) + "s";
  }

  if (seconds < 3600) {
    return "in " + Math.ceil(seconds / 60) + " min";
  }

  if (seconds < 86400) {
    return "in " + Math.ceil(seconds / 3600) + "h";
  }

  return "in " + Math.ceil(seconds / 86400) + " days";
}
