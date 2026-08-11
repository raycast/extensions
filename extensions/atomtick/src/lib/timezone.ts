import { getPreferenceValues } from "@raycast/api";

export interface ZonedTimeParts {
  hours: number;
  minutes: number;
  seconds: number;
  ms: number;
}

interface ResolvedZone {
  timeZone: string | undefined;
  invalidOverride: string | undefined;
}

/** Avoid hammering preferences on the 200ms clock tick; re-check often enough for live overrides. */
const PREFERENCE_CACHE_MS = 2000;

let validatedOverride: { input: string; valid: boolean } | undefined;
let preferenceCache: { readAtMs: number; key: string; zone: ResolvedZone } | undefined;

function isValidTimeZone(tz: string): boolean {
  if (validatedOverride?.input === tz) return validatedOverride.valid;

  let valid: boolean;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    valid = true;
  } catch {
    valid = false;
  }
  validatedOverride = { input: tz, valid };
  return valid;
}

function resolveFromOverride(trimmed: string): ResolvedZone {
  if (!trimmed) return { timeZone: undefined, invalidOverride: undefined };

  return isValidTimeZone(trimmed)
    ? { timeZone: trimmed, invalidOverride: undefined }
    : { timeZone: undefined, invalidOverride: trimmed };
}

function resolveTimeZone(): ResolvedZone {
  const now = Date.now();
  if (preferenceCache && now - preferenceCache.readAtMs < PREFERENCE_CACHE_MS) {
    return preferenceCache.zone;
  }

  const key = getPreferenceValues<Preferences>().timezoneOverride?.trim() ?? "";
  if (preferenceCache && preferenceCache.key === key) {
    preferenceCache = { ...preferenceCache, readAtMs: now };
    return preferenceCache.zone;
  }

  const zone = resolveFromOverride(key);
  preferenceCache = { readAtMs: now, key, zone };
  return zone;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string | undefined): Intl.DateTimeFormat {
  const key = timeZone ?? "system";
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatterCache.set(key, formatter);
  }
  return formatter;
}

/** Wall-clock time parts for the active timezone: the configured override, or the Mac's current system timezone. */
export function getZonedTimeParts(atomicMs: number): ZonedTimeParts {
  const { timeZone } = resolveTimeZone();
  const parts = getFormatter(timeZone).formatToParts(new Date(atomicMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  return {
    hours: get("hour") % 24,
    minutes: get("minute"),
    seconds: get("second"),
    ms: ((atomicMs % 1000) + 1000) % 1000,
  };
}

/** Human-readable label for metadata panels: the IANA zone in effect, or a warning if the override is invalid. */
export function getActiveTimeZoneLabel(): string {
  const { timeZone, invalidOverride } = resolveTimeZone();
  if (invalidOverride) return `Invalid override "${invalidOverride}" — using system`;
  return timeZone ?? `${Intl.DateTimeFormat().resolvedOptions().timeZone} (system)`;
}
