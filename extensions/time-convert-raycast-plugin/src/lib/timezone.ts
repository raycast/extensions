export type ZoneSpec =
  | { kind: "iana"; name: string; label?: string }
  | { kind: "fixed"; offsetMinutes: number; label: string };

export interface DateComponents {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  second?: number;
  millisecond?: number;
}

interface DateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const minutesInHour = 60;
const millisecondsInMinute = 60_000;
const offsetPattern = /^(?:UTC|GMT)\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?$/i;
const bareOffsetPattern = /^([+-])\s*(\d{1,2})(?::?(\d{2}))?$/;
const etcPattern = /^Etc\/GMT([+-])(\d{1,2})$/i;

const partsFormatterCache = new Map<string, Intl.DateTimeFormat>();
const zoneNameFormatterCache = new Map<string, Intl.DateTimeFormat>();

function pad(value: number, width = 2): string {
  return value.toString().padStart(width, "0");
}

function formatterForParts(timeZone: string): Intl.DateTimeFormat {
  const cacheKey = `parts:${timeZone}`;
  const cached = partsFormatterCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  partsFormatterCache.set(cacheKey, formatter);
  return formatter;
}

function formatterForZoneName(timeZone: string): Intl.DateTimeFormat {
  const cacheKey = `zone:${timeZone}`;
  const cached = zoneNameFormatterCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  zoneNameFormatterCache.set(cacheKey, formatter);
  return formatter;
}

function toDateParts(date: Date, timeZone: string): DateParts {
  const parts = formatterForParts(timeZone).formatToParts(date);

  let year = 0;
  let month = 0;
  let day = 0;
  let hour = 0;
  let minute = 0;
  let second = 0;

  for (const part of parts) {
    if (part.type === "year") {
      year = Number(part.value);
    } else if (part.type === "month") {
      month = Number(part.value);
    } else if (part.type === "day") {
      day = Number(part.value);
    } else if (part.type === "hour") {
      hour = Number(part.value);
    } else if (part.type === "minute") {
      minute = Number(part.value);
    } else if (part.type === "second") {
      second = Number(part.value);
    }
  }

  return { year, month, day, hour, minute, second };
}

function zoneName(date: Date, timeZone: string): string {
  const parts = formatterForZoneName(timeZone).formatToParts(date);
  const zonePart = parts.find((part) => part.type === "timeZoneName");
  return zonePart?.value ?? timeZone;
}

function formatOffset(minutes: number): string {
  const sign = minutes >= 0 ? "+" : "-";
  const absolute = Math.abs(minutes);
  const hh = Math.trunc(absolute / minutesInHour);
  const mm = absolute % minutesInHour;
  return `${sign}${pad(hh)}:${pad(mm)}`;
}

function formatDateString(parts: DateParts, offsetMinutes: number, zoneToken: string): string {
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)} ${formatOffset(offsetMinutes)} ${zoneToken}`;
}

function parseFixedOffset(raw: string): ZoneSpec | null {
  const etc = raw.match(etcPattern);
  if (etc) {
    const direction = etc[1];
    const hours = Number(etc[2]);
    if (hours > 23) {
      return null;
    }

    // IANA Etc/GMT uses reversed signs: Etc/GMT+7 means UTC-07:00.
    const offsetMinutes = (direction === "+" ? -1 : 1) * hours * minutesInHour;
    return {
      kind: "fixed",
      offsetMinutes,
      label: `UTC${formatOffset(offsetMinutes)}`,
    };
  }

  const prefixed = raw.match(offsetPattern);
  if (prefixed) {
    const direction = prefixed[1];
    const hours = Number(prefixed[2]);
    const minutes = Number(prefixed[3] ?? "0");
    if (hours > 23 || minutes > 59) {
      return null;
    }

    const offsetMinutes = (direction === "+" ? 1 : -1) * (hours * minutesInHour + minutes);
    return {
      kind: "fixed",
      offsetMinutes,
      label: `UTC${formatOffset(offsetMinutes)}`,
    };
  }

  const bare = raw.match(bareOffsetPattern);
  if (bare) {
    const direction = bare[1];
    const hours = Number(bare[2]);
    const minutes = Number(bare[3] ?? "0");
    if (hours > 23 || minutes > 59) {
      return null;
    }

    const offsetMinutes = (direction === "+" ? 1 : -1) * (hours * minutesInHour + minutes);
    return {
      kind: "fixed",
      offsetMinutes,
      label: `UTC${formatOffset(offsetMinutes)}`,
    };
  }

  return null;
}

export function localTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function isValidIanaTimeZone(timeZone: string): boolean {
  try {
    formatterForParts(timeZone).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function parseZone(raw?: string | null): ZoneSpec | null {
  const value = raw?.trim();
  if (!value) {
    return null;
  }

  if (/^local$/i.test(value)) {
    return { kind: "iana", name: localTimeZone(), label: "Local" };
  }

  if (/^(utc|gmt|z)$/i.test(value)) {
    return { kind: "fixed", offsetMinutes: 0, label: "UTC" };
  }

  const fixed = parseFixedOffset(value);
  if (fixed) {
    return fixed;
  }

  if (isValidIanaTimeZone(value)) {
    return { kind: "iana", name: value };
  }

  return null;
}

export function zoneDisplayName(zone: ZoneSpec): string {
  if (zone.kind === "fixed") {
    return zone.label;
  }
  return zone.label ?? zone.name;
}

export function zoneKey(zone: ZoneSpec): string {
  if (zone.kind === "fixed") {
    return `fixed:${zone.offsetMinutes}`;
  }
  return `iana:${zone.name}`;
}

export function parseOutputZones(rawList: string | undefined, includeLocal = true): ZoneSpec[] {
  const zones: ZoneSpec[] = [];
  const seen = new Set<string>();

  const pushUnique = (zone: ZoneSpec | null) => {
    if (!zone) {
      return;
    }
    const key = zoneKey(zone);
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    zones.push(zone);
  };

  if (includeLocal) {
    pushUnique(parseZone("Local"));
  }

  const rawEntries = rawList
    ?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (rawEntries) {
    for (const entry of rawEntries) {
      pushUnique(parseZone(entry));
    }
  }

  if (zones.length === 0) {
    pushUnique(parseZone("UTC"));
  }

  return zones;
}

export function getTimeZoneOffsetMilliseconds(date: Date, timeZone: string): number {
  const parts = toDateParts(date, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - date.getTime();
}

export function toInstantFromComponents(components: DateComponents, zone: ZoneSpec): Date {
  const hour = components.hour ?? 0;
  const minute = components.minute ?? 0;
  const second = components.second ?? 0;
  const millisecond = components.millisecond ?? 0;

  const utcGuess = Date.UTC(components.year, components.month - 1, components.day, hour, minute, second, millisecond);

  if (zone.kind === "fixed") {
    return new Date(utcGuess - zone.offsetMinutes * millisecondsInMinute);
  }

  const firstOffset = getTimeZoneOffsetMilliseconds(new Date(utcGuess), zone.name);
  let adjusted = utcGuess - firstOffset;
  const secondOffset = getTimeZoneOffsetMilliseconds(new Date(adjusted), zone.name);
  if (secondOffset !== firstOffset) {
    adjusted = utcGuess - secondOffset;
  }

  return new Date(adjusted);
}

export function formatInstantForZone(date: Date, zone: ZoneSpec): string {
  if (zone.kind === "fixed") {
    const shifted = new Date(date.getTime() + zone.offsetMinutes * millisecondsInMinute);
    const parts: DateParts = {
      year: shifted.getUTCFullYear(),
      month: shifted.getUTCMonth() + 1,
      day: shifted.getUTCDate(),
      hour: shifted.getUTCHours(),
      minute: shifted.getUTCMinutes(),
      second: shifted.getUTCSeconds(),
    };
    return formatDateString(parts, zone.offsetMinutes, zone.label);
  }

  const parts = toDateParts(date, zone.name);
  const offsetMinutes = Math.trunc(getTimeZoneOffsetMilliseconds(date, zone.name) / millisecondsInMinute);
  return formatDateString(parts, offsetMinutes, zoneName(date, zone.name));
}
