import { getPreferenceValues } from "@raycast/api";

import { discoverTailscalePath } from "./lib/tailscale-path";

type TailscalePreferences = Preferences.Tailscale;

export function getExtensionPreferences(): TailscalePreferences {
  return getPreferenceValues<TailscalePreferences>();
}

export function resolveTailscalePath(preferences: TailscalePreferences): string {
  return preferences.tailscalePath?.trim() || discoverTailscalePath();
}

export function resolveRefreshInterval(preferences: TailscalePreferences): number {
  const parsed = Number.parseInt(preferences.refreshIntervalSeconds, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
}
