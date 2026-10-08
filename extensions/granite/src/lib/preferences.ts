// The single Raycast-coupled seam: read the token + base URL from extension
// preferences and hand back a ready GraniteClient. Everything else imports
// getClient() so the network layer stays in one place.

import { getPreferenceValues } from "@raycast/api";
import { GraniteClient } from "./granite";

// `Preferences` is generated from the manifest's `preferences` block
// (raycast-env.d.ts), so the token + base-URL types stay in sync with
// package.json automatically — no hand-maintained interface to drift.
export function getClient(): GraniteClient {
  const { apiKey, apiBase } = getPreferenceValues<Preferences>();
  return new GraniteClient({ token: apiKey, baseUrl: apiBase?.trim() || undefined });
}
