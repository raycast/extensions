import { getPreferenceValues } from "@raycast/api";
import {
  resolveJumpseatConfiguration,
  type JumpseatConfiguration,
} from "./config-values";

interface Preferences {
  apiBaseUrl: string;
  webBaseUrl: string;
}

export function getJumpseatConfiguration(): JumpseatConfiguration {
  const preferences = getPreferenceValues<Preferences>();
  return resolveJumpseatConfiguration(
    preferences.apiBaseUrl,
    preferences.webBaseUrl,
  );
}
