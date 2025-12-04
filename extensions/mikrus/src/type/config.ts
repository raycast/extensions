import { getPreferenceValues } from "@raycast/api";

export interface ConfigurationPreferencesType {
  apiKey: string;
  defaultServer: string;
  GetApiKey(): string;
  GetDefaultServer(): string;
}

function getConfig(): ConfigurationPreferencesType {
  return getPreferenceValues<ConfigurationPreferencesType>();
}

export function GetApiKey(): string {
  return getConfig().apiKey;
}
export function GetDefaultServer(): string {
  return getConfig().defaultServer;
}
