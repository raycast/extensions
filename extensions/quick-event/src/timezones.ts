export interface TimezoneInfo {
  abbreviation: string;
  ianaTimezone?: string;
  offsetMinutes?: number;
}

const NAMED_TIMEZONES: Record<string, string> = {
  ET: 'America/New_York',
  EST: 'America/New_York',
  EDT: 'America/New_York',
  CT: 'America/Chicago',
  CST: 'America/Chicago',
  CDT: 'America/Chicago',
  MT: 'America/Denver',
  MST: 'America/Denver',
  MDT: 'America/Denver',
  PT: 'America/Los_Angeles',
  PST: 'America/Los_Angeles',
  PDT: 'America/Los_Angeles',
  AKST: 'America/Anchorage',
  AKDT: 'America/Anchorage',
  HST: 'Pacific/Honolulu',
  HDT: 'Pacific/Honolulu',
  BST: 'Europe/London',
  CET: 'Europe/Paris',
  CEST: 'Europe/Paris',
  EET: 'Europe/Athens',
  EEST: 'Europe/Athens',
  WET: 'Europe/Lisbon',
  WEST: 'Europe/Lisbon',
  MSK: 'Europe/Moscow',
  TRT: 'Europe/Istanbul',
  IST: 'Asia/Kolkata',
  JST: 'Asia/Tokyo',
  KST: 'Asia/Seoul',
  SGT: 'Asia/Singapore',
  HKT: 'Asia/Hong_Kong',
  PHT: 'Asia/Manila',
  ICT: 'Asia/Bangkok',
  WIB: 'Asia/Jakarta',
  GST: 'Asia/Dubai',
  PKT: 'Asia/Karachi',
  AEST: 'Australia/Sydney',
  AEDT: 'Australia/Sydney',
  ACST: 'Australia/Adelaide',
  ACDT: 'Australia/Adelaide',
  AWST: 'Australia/Perth',
  NZST: 'Pacific/Auckland',
  NZDT: 'Pacific/Auckland',
};

const OFFSET_PATTERN = /\b(?:GMT|UTC|UT)\s*([+-])\s*(\d{1,2})(?::(\d{2}))?\b/i;
const NAMED_PATTERN =
  /\b(ET|EST|EDT|CT|CST|CDT|MT|MST|MDT|PT|PST|PDT|AKST|AKDT|HST|HDT|BST|CET|CEST|EET|EEST|WET|WEST|MSK|TRT|IST|JST|KST|SGT|HKT|PHT|ICT|WIB|GST|PKT|AEST|AEDT|ACST|ACDT|AWST|NZST|NZDT)\b/i;
const BARE_GMT_PATTERN = /\b(?:GMT|UTC|UT)\b/i;

export function extractTimezone(query: string): { query: string; timezone: TimezoneInfo | null } {
  const offsetMatch = query.match(OFFSET_PATTERN);
  if (offsetMatch) {
    const sign = offsetMatch[1] === '-' ? -1 : 1;
    const hours = parseInt(offsetMatch[2], 10);
    const minutes = offsetMatch[3] ? parseInt(offsetMatch[3], 10) : 0;
    const offsetMinutes = sign * (hours * 60 + minutes);
    const matchedText = offsetMatch[0];
    const cleanQuery = query
      .replace(matchedText, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    return {
      query: cleanQuery,
      timezone: { abbreviation: matchedText.toUpperCase().replace(/\s+/g, ''), offsetMinutes },
    };
  }

  const namedMatch = query.match(NAMED_PATTERN);
  if (namedMatch) {
    const abbr = namedMatch[1].toUpperCase();
    const iana = NAMED_TIMEZONES[abbr];
    if (iana) {
      const cleanQuery = query
        .replace(namedMatch[0], '')
        .replace(/\s{2,}/g, ' ')
        .trim();
      return {
        query: cleanQuery,
        timezone: { abbreviation: abbr, ianaTimezone: iana },
      };
    }
  }

  const bareGmtMatch = query.match(BARE_GMT_PATTERN);
  if (bareGmtMatch) {
    const cleanQuery = query
      .replace(bareGmtMatch[0], '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    return {
      query: cleanQuery,
      timezone: { abbreviation: 'GMT', offsetMinutes: 0 },
    };
  }

  return { query, timezone: null };
}

function getIanaOffset(ianaTimezone: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: ianaTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = part.value;
    }
  }

  const hour = map.hour === '24' ? 0 : parseInt(map.hour, 10);
  const asUTC = Date.UTC(
    parseInt(map.year, 10),
    parseInt(map.month, 10) - 1,
    parseInt(map.day, 10),
    hour,
    parseInt(map.minute, 10),
    parseInt(map.second, 10),
  );

  return (asUTC - date.getTime()) / 60000;
}

export function getLocalOffset(date: Date): number {
  return -date.getTimezoneOffset();
}

export function getOffsetForTimezone(timezone: TimezoneInfo, date: Date): number {
  if (timezone.offsetMinutes !== undefined) {
    return timezone.offsetMinutes;
  }
  if (timezone.ianaTimezone) {
    return getIanaOffset(timezone.ianaTimezone, date);
  }
  return 0;
}

export function adjustDateForTimezone(date: Date, timezone: TimezoneInfo): Date {
  const localOffset = getLocalOffset(date);
  const targetOffset = getOffsetForTimezone(timezone, date);
  const adjustmentMinutes = localOffset - targetOffset;
  return new Date(date.getTime() + adjustmentMinutes * 60000);
}

export function unadjustDateForTimezone(date: Date, timezone: TimezoneInfo): Date {
  const localOffset = getLocalOffset(date);
  const targetOffset = getOffsetForTimezone(timezone, date);
  const adjustmentMinutes = targetOffset - localOffset;
  return new Date(date.getTime() + adjustmentMinutes * 60000);
}

export function formatOffsetLabel(timezone: TimezoneInfo): string {
  if (timezone.offsetMinutes !== undefined) {
    const mins = timezone.offsetMinutes;
    const sign = mins >= 0 ? '+' : '-';
    const abs = Math.abs(mins);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return m === 0
      ? `${timezone.abbreviation} (UTC${sign}${h})`
      : `${timezone.abbreviation} (UTC${sign}${h}:${m.toString().padStart(2, '0')})`;
  }
  if (timezone.ianaTimezone) {
    return timezone.abbreviation;
  }
  return timezone.abbreviation;
}
