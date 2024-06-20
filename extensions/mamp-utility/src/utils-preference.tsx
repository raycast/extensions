import { getPreferenceValues } from "@raycast/api";
const prefernce = getPreferenceValues<Preferences>();

export function get_pref_siteFolder(): string {
  return prefernce.pref_siteFolder;
}

export function get_pref_mysqlPort(): string {
  return prefernce.pref_mysqlPort;
}

export function get_pref_apachePort(): string {
  return prefernce.pref_apachePort;
}

export function get_pref_nginxPort(): string {
  return prefernce.pref_nginxPort;
}
