import { environment, getPreferenceValues, Cache } from "@raycast/api";

const SIGNATURE = "Created with <a href='https://raycast.com'>Raycast</a>";

const preferences: Preferences.CreateEvent = getPreferenceValues();

export function roundUpTime(date = new Date(), roundMins = 15) {
  const ms = 1000 * 60 * roundMins;
  return new Date(Math.ceil(date.getTime() / ms) * ms);
}

export function addSignature(description: string | undefined) {
  if (!preferences.addSignature) {
    return description;
  }

  if (!description) {
    return SIGNATURE;
  }

  return `${description}\n<hr>${SIGNATURE}`;
}

function parseRRule(rrule: string): string {
  // Remove RRULE: prefix if present
  const rule = rrule.replace("RRULE:", "");
  const parts = rule.split(";");
  const ruleObj: Record<string, string> = {};

  parts.forEach((part) => {
    const [key, value] = part.split("=");
    ruleObj[key] = value;
  });

  const freq = ruleObj.FREQ?.toLowerCase() || "";
  const interval = ruleObj.INTERVAL ? parseInt(ruleObj.INTERVAL) : 1;
  const count = ruleObj.COUNT ? parseInt(ruleObj.COUNT) : undefined;
  const until = ruleObj.UNTIL
    ? new Date(`${ruleObj.UNTIL.slice(0, 4)}-${ruleObj.UNTIL.slice(4, 6)}-${ruleObj.UNTIL.slice(6, 8)}`)
    : undefined;

  let humanReadable = "";

  // Handle frequency and interval
  if (interval === 1) {
    humanReadable = `Every ${freq.slice(0, -2)}`;
  } else {
    humanReadable = `Every ${interval} ${freq.slice(0, -2)}s`;
  }

  // Handle end condition
  if (count) {
    humanReadable += `, ${count} times`;
  } else if (until) {
    humanReadable += ` until ${until.toLocaleDateString()}`;
  }

  // Handle specific days for weekly recurrence
  if (freq === "weekly" && ruleObj.BYDAY) {
    const days = ruleObj.BYDAY.split(",").map((day) => {
      const dayMap: Record<string, string> = {
        MO: "Monday",
        TU: "Tuesday",
        WE: "Wednesday",
        TH: "Thursday",
        FR: "Friday",
        SA: "Saturday",
        SU: "Sunday",
      };
      return dayMap[day];
    });

    if (days.length > 0) {
      humanReadable += ` on ${days.join(", ")}`;
    }
  }

  return humanReadable;
}

export function formatRecurrence(recurrence: string[]): string {
  if (!recurrence?.length) return "";

  const rules = recurrence
    .map((rule) => {
      if (rule.startsWith("RRULE:")) {
        return parseRRule(rule);
      } else if (rule.startsWith("EXRULE:")) {
        return `Except ${parseRRule(rule.replace("EXRULE:", ""))}`;
      } else if (rule.startsWith("RDATE:")) {
        const dates = rule
          .replace("RDATE:", "")
          .split(",")
          .map((date) => new Date(date).toLocaleDateString());
        return `Also occurs on ${dates.join(", ")}`;
      } else if (rule.startsWith("EXDATE:")) {
        const dates = rule
          .replace("EXDATE:", "")
          .split(",")
          .map((date) => new Date(date).toLocaleDateString());
        return `Except on ${dates.join(", ")}`;
      }
      return "";
    })
    .filter(Boolean);

  return rules.join("\n");
}

export function isInternal() {
  return environment.supportPath.includes("com.raycast.macos.internal");
}

/**
 * Wraps a function with caching functionality using LocalStorage
 *
 * @param fn - The async function to cache results from
 * @param options - Optional configuration for the cache behavior
 * @param options.key - Custom cache key (defaults to stringified function)
 * @param options.validate - Optional validation function for cached data
 * @param options.maxAge - Maximum age of cached data in milliseconds
 * @returns The result of the function, either from cache or fresh execution
 *
 * @example
 * ```ts
 * const data = await withCache(
 *   async () => fetchExpensiveData(),
 *   { maxAge: 5 * 60 * 1000 } // Cache for 5 minutes
 * );
 * ```
 */
export async function withCache<T>(
  fn: () => Promise<T>,
  options?: { key?: string; validate?: (data: T) => boolean; maxAge?: number },
): Promise<T> {
  const cache = new Cache();
  const key = options?.key ?? fn.toString();
  const cached = cache.get(key);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    const isExpired = options?.maxAge && Date.now() - timestamp > options.maxAge;
    if (!isExpired && (!options?.validate || options.validate(data))) {
      return data;
    }
  }

  const result = await fn();
  cache.set(
    key,
    JSON.stringify({
      data: result,
      timestamp: Date.now(),
    }),
  );
  return result;
}
