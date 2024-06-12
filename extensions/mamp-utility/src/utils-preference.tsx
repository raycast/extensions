import { getPreferenceValues } from "@raycast/api";

interface Preferences {
	pref_siteFolder: string;
	pref_mysqlPort: string;
	pref_apachePort: string;
	pref_nginxPort: string;
}
export function get_pref_siteFolder(): string {
	const prefernce = getPreferenceValues<Preferences>();
	return prefernce.pref_siteFolder;
}
export function get_pref_mysqlPort(): string {
	const prefernce = getPreferenceValues<Preferences>();
	return prefernce.pref_mysqlPort;
}
export function get_pref_apachePort(): string {
	const prefernce = getPreferenceValues<Preferences>();
	return prefernce.pref_apachePort;
}
export function get_pref_nginxPort(): string {
	const prefernce = getPreferenceValues<Preferences>();
	return prefernce.pref_nginxPort;
}
