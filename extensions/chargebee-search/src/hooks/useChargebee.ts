import { getPreferenceValues } from "@raycast/api";
import { Preferences, SiteConfig } from "../types/chargebee";

export function useSiteConfigs(): SiteConfig[] {
  const prefs = getPreferenceValues<Preferences>();

  const configs: SiteConfig[] = [
    {
      name: prefs.primary_site_name,
      site: prefs.primary_site,
      apiKey: prefs.primary_api_key,
    },
  ];

  // Add secondary site only if configured
  if (prefs.secondary_site && prefs.secondary_api_key) {
    configs.push({
      name: prefs.secondary_site_name || "Secondary",
      site: prefs.secondary_site,
      apiKey: prefs.secondary_api_key,
    });
  }

  return configs;
}

export function getAuthHeader(apiKey: string): string {
  // Chargebee uses HTTP Basic Auth with API key as username and empty password
  return "Basic " + Buffer.from(apiKey + ":").toString("base64");
}

export async function chargebeeRequest<T>(
  siteConfig: SiteConfig,
  endpoint: string,
  params?: Record<string, string>,
): Promise<T> {
  let url = `https://${siteConfig.site}.chargebee.com/api/v2${endpoint}`;

  if (params) {
    // Build query string - Chargebee expects brackets unencoded in parameter names
    const queryParts = Object.entries(params).map(([key, value]) => {
      // Only encode the value, keep brackets in key as-is
      return `${key}=${encodeURIComponent(value)}`;
    });
    url += "?" + queryParts.join("&");
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: getAuthHeader(siteConfig.apiKey),
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Chargebee API error: ${response.status} ${response.statusText} - ${errorBody}`,
    );
  }

  return response.json() as Promise<T>;
}
