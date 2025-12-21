import { getPreferenceValues } from "@raycast/api";
import { api } from "node-app-store-connect-api";
import { App, AppStoreVersion, ProcessedApp, ApiResponse } from "../types";

type ApiClient = Awaited<ReturnType<typeof api>>;

let cachedApi: ApiClient | null = null;

function cleanPrivateKey(rawKey: string): string {
  let privateKey = rawKey.trim();

  // If the key doesn't have proper newlines, try to fix it
  if (!privateKey.includes("\n")) {
    // Handle case where user pasted without newlines
    privateKey = privateKey
      .replace("-----BEGIN PRIVATE KEY-----", "-----BEGIN PRIVATE KEY-----\n")
      .replace("-----END PRIVATE KEY-----", "\n-----END PRIVATE KEY-----");

    // Try to add newlines every 64 characters for the base64 content
    const beginMarker = "-----BEGIN PRIVATE KEY-----\n";
    const endMarker = "\n-----END PRIVATE KEY-----";

    if (privateKey.includes(beginMarker) && privateKey.includes(endMarker)) {
      const start = privateKey.indexOf(beginMarker) + beginMarker.length;
      const end = privateKey.indexOf(endMarker);
      const base64Content = privateKey.substring(start, end);

      // Split into 64-character lines
      const formattedContent = base64Content.match(/.{1,64}/g)?.join("\n") || base64Content;

      privateKey = beginMarker + formattedContent + endMarker;
    }
  }

  return privateKey;
}

async function getApiClient(): Promise<ApiClient> {
  if (cachedApi) {
    return cachedApi;
  }

  const preferences = getPreferenceValues();
  const privateKey = cleanPrivateKey(preferences.privateKey);

  try {
    cachedApi = await api({
      issuerId: preferences.issuerId,
      apiKey: preferences.apiKey,
      privateKey: privateKey,
    });
    return cachedApi;
  } catch (error) {
    cachedApi = null;
    throw error;
  }
}

export async function fetchApps(): Promise<ProcessedApp[]> {
  const client = await getApiClient();

  // Fetch apps with their app store versions
  const response = (await client.readAll(
    "apps?include=appStoreVersions&fields[appStoreVersions]=platform,versionString,appStoreState,createdDate,releaseType",
  )) as ApiResponse;

  const { data: apps, included } = response;

  // Get all versions from the included object (indexed by ID)
  const versionsById = included?.appStoreVersions || {};

  return apps.map((app: App) => {
    // Find versions related to this app
    const appVersionIds = app.relationships?.appStoreVersions?.data?.map((v) => v.id) || [];
    const versions = appVersionIds.map((id) => versionsById[id]).filter((v): v is AppStoreVersion => v !== undefined);

    // Find the most recent version (by createdDate)
    const latestVersion = versions.sort(
      (a, b) => new Date(b.attributes.createdDate).getTime() - new Date(a.attributes.createdDate).getTime(),
    )[0];

    return {
      id: app.id,
      name: app.attributes.name,
      bundleId: app.attributes.bundleId,
      latestVersion: latestVersion
        ? {
            id: latestVersion.id,
            versionString: latestVersion.attributes.versionString,
            state: latestVersion.attributes.appStoreState,
            platform: latestVersion.attributes.platform,
            createdDate: latestVersion.attributes.createdDate,
            releaseType: latestVersion.attributes.releaseType,
          }
        : undefined,
      appStoreConnectUrl: `https://appstoreconnect.apple.com/apps/${app.id}/appstore`,
    };
  });
}

export function resetApiClient(): void {
  cachedApi = null;
}
