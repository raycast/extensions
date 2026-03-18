import { getPreferenceValues } from "@raycast/api";

import { discoverTailscalePath } from "./lib/tailscale-path";

export interface ExtensionPreferences {
  tailscalePath?: string;
  refreshIntervalSeconds: string;
  showOfflinePeers: boolean;
}

export function getExtensionPreferences(): ExtensionPreferences {
  return getPreferenceValues<ExtensionPreferences>();
}

export function resolveTailscalePath(preferences: ExtensionPreferences): string {
  return preferences.tailscalePath?.trim() || discoverTailscalePath();
}

export function resolveRefreshInterval(preferences: ExtensionPreferences): number {
  const parsed = Number.parseInt(preferences.refreshIntervalSeconds, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
}
