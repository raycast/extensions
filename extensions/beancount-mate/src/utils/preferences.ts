import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  costflowConfigFilePath: string;
  beancountJournalFilePath?: string;
}

export const preferences = getPreferenceValues<Preferences>();

const home: string = process.env.HOME ?? process.env.USERPROFILE ?? "";
export const costflowConfigFilePath = preferences.costflowConfigFilePath.replace(/^~/, home);
