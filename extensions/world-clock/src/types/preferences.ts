import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  itemLayout: string;
  columns: string;
  showClock: boolean;
  rememberTag: boolean;
  showFirstTimezone: boolean;
  hour24: boolean;
  dateFormat: string;
}

export const { itemLayout, columns, showClock, rememberTag, showFirstTimezone, hour24, dateFormat } =
  getPreferenceValues<Preferences>();
