/**
 * Shared Raycast preference reader and client factory.
 */

import { getPreferenceValues } from "@raycast/api";
import { FrihetRestClient } from "./frihet-client.js";
import { globalTenantCache } from "./tenant-cache.js";
import type { FrihetPreferences } from "./types.js";

export function createClientFromPreferences(): FrihetRestClient {
  const prefs = getPreferenceValues<FrihetPreferences>();
  return new FrihetRestClient({
    apiKey: prefs.apiKey,
    apiBaseUrl: prefs.apiBaseUrl,
    cache: globalTenantCache,
  });
}

export function clearActiveWorkspaceCache(): void {
  globalTenantCache.purgeAll("user_requested_clear");
}
