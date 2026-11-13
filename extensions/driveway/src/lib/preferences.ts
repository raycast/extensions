import { getPreferenceValues } from "@raycast/api";

// Read per call, so Refresh picks up a checkbox toggled mid-session.
function prefs() {
  return getPreferenceValues<Preferences>();
}

// The always-included host, and the credentials for that host alone. They
// are never offered to a machine discovery merely happened to find.
export function discoveryHost(): string {
  return prefs().pref_discovery_host ?? "";
}

export function discoveryUsername(): string {
  return prefs().pref_discovery_username ?? "";
}

export function discoveryPassword(): string {
  return prefs().pref_discovery_password ?? "";
}

// Empty for any host other than the configured one, so a share saved from
// discovery never inherits an account that belongs to a different machine.
export function discoveryUsernameFor(host: string): string {
  const configured = discoveryHost().trim().toLowerCase();
  return configured && host.trim().toLowerCase() === configured ? discoveryUsername() : "";
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
