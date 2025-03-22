import { Icon } from "@raycast/api";

export interface TimezoneId {
  type: string;
  region: string;
}

export interface Timezone {
  timezone: string;
  utc_offset: string;
  date_time: string;
  unixtime: number;
  alias?: string;
  memo?: string;
  memoIcon?: Icon;
  tags?: string[];
  avatar?: string[];
}

export interface IPGeolocation {
  status: string;
  query: string;
}

export interface CurrentTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  seconds: number;
  milliSeconds: number;
  dateTime: string; // ISO 8601 string
  date: string; // DD/MM/YYYY format
  time: string; // HH:mm format
  timeZone: string; // Time zone string
  dayOfWeek: string; // Day name, e.g., "Sunday"
  dstActive: boolean; // Indicates if daylight saving time is active
}

export interface TimezoneInfo {
  timeZone: string;
  currentLocalTime: string; // ISO 8601 format
  currentUtcOffset: OffsetInfo;
  standardUtcOffset: OffsetInfo;
  hasDayLightSaving: boolean;
  isDayLightSavingActive: boolean;
  dstInterval: DSTInterval;
}

export interface OffsetInfo {
  seconds: number;
  milliseconds: number;
  ticks: number;
  nanoseconds: number;
}

export interface DSTInterval {
  dstName: string;
  dstOffsetToUtc: OffsetInfo;
  dstOffsetToStandardTime: OffsetInfo;
  dstStart: string; // ISO 8601 format
  dstEnd: string; // ISO 8601 format
  dstDuration: DurationInfo;
}

export interface DurationInfo {
  days: number;
  nanosecondOfDay: number;
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
  subsecondTicks: number;
  subsecondNanoseconds: number;
  bclCompatibleTicks: number;
  totalDays: number;
  totalHours: number;
  totalMinutes: number;
  totalSeconds: number;
  totalMilliseconds: number;
  totalTicks: number;
  totalNanoseconds: number;
}
