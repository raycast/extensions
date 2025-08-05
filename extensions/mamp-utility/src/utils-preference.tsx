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

export function get_pref_mamp_path(): string {
  return prefernce.pref_mamp!.path;
}
export function get_pref_openWith_name(): string {
  return prefernce.pref_openWith!.name;
}
export function get_pref_openWith_path(): string {
  return prefernce.pref_openWith!.path;
}
