import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  costflowConfigFilePath: string;
  beancountJournalFilePath?: string;
}

export const preferences = getPreferenceValues<Preferences>();
