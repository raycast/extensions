import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  fontFallback: boolean;
  actionAfterDecoration: string;
  itemLayout: string;
  columns: string;
}

export const { fontFallback, actionAfterDecoration, itemLayout, columns } = getPreferenceValues<Preferences>();
