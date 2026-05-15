import { getPreferenceValues } from "@raycast/api";
import { Gitea } from "@go-gitea/sdk.js";

type Prefs = { serverUrl: string; accessToken: string };

let cachedClient: Gitea | null = null;
let cachedKey: string | null = null;

export function getClient() {
  const { serverUrl, accessToken } = getPreferenceValues<Prefs>();
  const baseUrl = serverUrl.replace(/\/+$/, "");
  const nextKey = `${baseUrl}::${accessToken}`;

  if (cachedClient && cachedKey === nextKey) return cachedClient;

  cachedClient = new Gitea({
    baseUrl,
    auth: accessToken,
  });
  cachedKey = nextKey;

  return cachedClient;
}
