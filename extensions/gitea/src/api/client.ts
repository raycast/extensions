import { getPreferenceValues } from "@raycast/api";
import createClient from "openapi-fetch";
import type { paths } from "../types/gitea";
import { API_BASE } from "../constants";

type Prefs = { serverUrl: string; accessToken: string };

let cachedClient: ReturnType<typeof createClient<paths>> | null = null;
let cachedKey: string | null = null;

function normalizeBaseUrl(baseUrl: string): string {
  // Remove trailing slash
  let normalized = baseUrl.replace(/\/$/, "");

  // Add /api/v1 if not present
  if (!normalized.endsWith(API_BASE)) {
    normalized += API_BASE;
  }

  return normalized;
}

export function getClient() {
  const { serverUrl, accessToken } = getPreferenceValues<Prefs>();
  const baseUrl = normalizeBaseUrl(serverUrl);
  const nextKey = `${baseUrl}::${accessToken}`;

  if (cachedClient && cachedKey === nextKey) return cachedClient;

  cachedClient = createClient<paths>({
    baseUrl,
    headers: {
      Authorization: `token ${accessToken}`,
    },
  });
  cachedKey = nextKey;

  return cachedClient;
}
