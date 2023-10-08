import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  layout: string;
  columns: string;
  itemInset: string;
  refreshInterval: number;
}

export const { layout, columns, itemInset, refreshInterval } = getPreferenceValues<Preferences>();
