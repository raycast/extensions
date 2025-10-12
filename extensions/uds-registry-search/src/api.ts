import { getPreferenceValues } from "@raycast/api";
import { CatalogResponse, PackageMetadata, Preferences } from "./types";

function getRegistryBaseUrl(): string {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.registryUrl || "https://registry.defenseunicorns.com";
}

async function fetchWithAuth(url: string): Promise<Response> {
  const preferences = getPreferenceValues<Preferences>();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (preferences.sessionCookie) {
    headers["Cookie"] = `uds_session=${preferences.sessionCookie}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timed out after 10 seconds");
    }
    throw error;
  }
}

export async function fetchCatalog(): Promise<CatalogResponse> {
  const baseUrl = getRegistryBaseUrl();
  const response = await fetchWithAuth(`${baseUrl}/uds/catalog`);
  return (await response.json()) as CatalogResponse;
}

export async function fetchPackageMetadata(org: string, packageName: string): Promise<PackageMetadata> {
  const baseUrl = getRegistryBaseUrl();
  const response = await fetchWithAuth(`${baseUrl}/uds/metadata/${org}/${packageName}`);
  return (await response.json()) as PackageMetadata;
}
