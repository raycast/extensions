import { getPreferenceValues } from "@raycast/api";

// Read per call, so Refresh picks up a checkbox toggled mid-session.
function prefs() {
  return getPreferenceValues<Preferences>();
}

// The always-included host, and the credentials used to expand any SMB
// host found by discovery.
export function discoveryHost(): string {
  return prefs().pref_discovery_host ?? "";
}

export function discoveryUsername(): string {
  return prefs().pref_discovery_username ?? "";
}

export function discoveryPassword(): string {
  return prefs().pref_discovery_password ?? "";
}

// Three independent sources. Only Bonjour is on by default.
export function bonjourEnabled(): boolean {
  return prefs().pref_discovery_bonjour ?? false;
}

export function subnetScanEnabled(): boolean {
  return prefs().pref_discovery_subnet_scan ?? false;
}

export function allDevicesEnabled(): boolean {
  return prefs().pref_discovery_all_devices ?? false;
}
