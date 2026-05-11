import { getTimeStamp } from "./utils";
import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues();

export function authToken() {
  return preferences.authToken || null;
}

export function defaultName() {
  return preferences.timeBased && preferences.dateFormat ? getTimeStamp(new Date(), preferences.dateFormat) : "";
}
