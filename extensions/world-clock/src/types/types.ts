import { Icon } from "@raycast/api";

export interface TimeInfo {
  abbreviation: string;
  client_ip: string;
  datetime: string;
  day_of_week: number;
  day_of_year: number;
  dst: boolean;
  dst_from: null;
  dst_offset: number;
  dst_until: null;
  raw_offset: number;
  timezone: string;
  unixtime: number;
  utc_datetime: string;
  utc_offset: string;
  week_number: number;
}

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
}

export interface IPGeolocation {
  status: string;
  query: string;
}
