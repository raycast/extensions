import { Color, Icon, getPreferenceValues } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { Preferences } from "./types";

export const preferences: Preferences = getPreferenceValues();
export const apiToken = preferences.SavvycalToken;
export const linksEndpoint = "/v1/links";
export const SAVVYCAL_BASE_URL = "https://savvycal.com";
export const SAVVYCAL_API_BASE_URL = "https://api.savvycal.com";
export const greenIcon = { source: Icon.CircleFilled, tintColor: Color.Green };
export const redIcon = { source: Icon.CircleFilled, tintColor: Color.Red };
export const clockIcon = {
  source: Icon.Clock,
  tintColor: Color.SecondaryText,
};
export const savvycalIcon = getFavicon("https://savvycal.com");
