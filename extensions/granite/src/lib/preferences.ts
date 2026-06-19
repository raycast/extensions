// The single Raycast-coupled seam: read the token + base URL from extension
// preferences and hand back a ready GraniteClient. Everything else imports
// getClient() so the network layer stays in one place.

import { getPreferenceValues } from "@raycast/api";
import { GraniteClient } from "./granite";

interface Preferences {
  apiKey: string;
  apiBase?: string;
}

export function getClient(): GraniteClient {
  const { apiKey, apiBase } = getPreferenceValues<Preferences>();
  return new GraniteClient({ token: apiKey, baseUrl: apiBase?.trim() || undefined });
}
