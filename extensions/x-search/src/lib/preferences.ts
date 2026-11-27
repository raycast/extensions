import { getPreferenceValues } from "@raycast/api";
import { parsePreferredTab, type PreferredTab } from "../features/search-link";

export function readPreferredTab(): PreferredTab {
  return parsePreferredTab(getPreferenceValues<Preferences>().resultsTab);
}

export function readPreferredBrowser(): Preferences["browser"] {
  return getPreferenceValues<Preferences>().browser;
}
