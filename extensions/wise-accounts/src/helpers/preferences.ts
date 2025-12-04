import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<Preferences>();
export const wiseReadApiToken = preferences.wiseReadApiToken;
export const displayEmptyBalances = preferences.displayEmptyBalances;
export const mainProfileId = preferences.mainProfileId;

interface Preferences {
  wiseReadApiToken: string;
  mainProfileId?: string;
  displayEmptyBalances?: boolean;
}
