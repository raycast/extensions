import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  layout: string;
  columns: string;
  itemInset: string;
  surfEngine: string;
}

export const { layout, columns, itemInset, surfEngine } = getPreferenceValues<Preferences>();
