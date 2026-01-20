import { getPreferenceValues, showToast, Toast } from "@raycast/api";

const API_BASE = "https://api.cloudflare.com/client/v4";

export interface Zone {
  id: string;
  name: string;
  status: string;
  paused: boolean;
}

interface CloudflareResponse<T> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: string[];
  result: T;
}

interface ZonesResult {
  result: Zone[];
  result_info: {
    page: number;
    per_page: number;
    total_count: number;
    total_pages: number;
  };
}

interface PurgeResult {
  id: string;
}

function getHeaders(): HeadersInit {
  const { apiToken } = getPreferenceValues<Preferences>();
  return {
    Authorization: `Bearer ${apiToken}`,
    "Content-Type": "application/json",
  };
}

export async function fetchZones(): Promise<Zone[]> {
  try {
    const response = await fetch(`${API_BASE}/zones?per_page=50`, {
      method: "GET",
      headers: getHeaders(),
    });

    const data = (await response.json()) as CloudflareResponse<Zone[]> &
      ZonesResult;

    if (!data.success) {
      const errorMsg = data.errors.map((e) => e.message).join(", ");
      throw new Error(errorMsg || "Failed to fetch zones");
    }

    return data.result;
  } catch (error) {
    console.error("Error fetching zones:", error);
    throw error;
  }
}

export async function purgeAllCache(zoneId: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/zones/${zoneId}/purge_cache`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ purge_everything: true }),
    });

    const data = (await response.json()) as CloudflareResponse<PurgeResult>;

    if (!data.success) {
      const errorMsg = data.errors.map((e) => e.message).join(", ");
      throw new Error(errorMsg || "Failed to purge cache");
    }

    return true;
  } catch (error) {
    console.error("Error purging all cache:", error);
    throw error;
  }
}

export async function purgeUrls(
  zoneId: string,
  urls: string[],
): Promise<boolean> {
  if (urls.length === 0) {
    throw new Error("No URLs provided");
  }

  if (urls.length > 30) {
    throw new Error(
      "Maximum 30 URLs per request. Split into multiple batches.",
    );
  }

  try {
    const response = await fetch(`${API_BASE}/zones/${zoneId}/purge_cache`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ files: urls }),
    });

    const data = (await response.json()) as CloudflareResponse<PurgeResult>;

    if (!data.success) {
      const errorMsg = data.errors.map((e) => e.message).join(", ");
      throw new Error(errorMsg || "Failed to purge URLs");
    }

    return true;
  } catch (error) {
    console.error("Error purging URLs:", error);
    throw error;
  }
}

export async function purgeTags(
  zoneId: string,
  tags: string[],
): Promise<boolean> {
  if (tags.length === 0) {
    throw new Error("No cache tags provided");
  }

  try {
    const response = await fetch(`${API_BASE}/zones/${zoneId}/purge_cache`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ tags }),
    });

    const data = (await response.json()) as CloudflareResponse<PurgeResult>;

    if (!data.success) {
      const errorMsg = data.errors.map((e) => e.message).join(", ");
      throw new Error(errorMsg || "Failed to purge by tags");
    }

    return true;
  } catch (error) {
    console.error("Error purging by tags:", error);
    throw error;
  }
}

export async function purgePrefix(
  zoneId: string,
  prefixes: string[],
): Promise<boolean> {
  if (prefixes.length === 0) {
    throw new Error("No prefixes provided");
  }

  try {
    const response = await fetch(`${API_BASE}/zones/${zoneId}/purge_cache`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ prefixes }),
    });

    const data = (await response.json()) as CloudflareResponse<PurgeResult>;

    if (!data.success) {
      const errorMsg = data.errors.map((e) => e.message).join(", ");
      throw new Error(errorMsg || "Failed to purge by prefix");
    }

    return true;
  } catch (error) {
    console.error("Error purging by prefix:", error);
    throw error;
  }
}

export function getDefaultZoneId(): string | undefined {
  const { defaultZoneId } = getPreferenceValues<Preferences>();
  return defaultZoneId;
}

export function extractDomainFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

export async function findZoneByDomain(domain: string): Promise<Zone | null> {
  const zones = await fetchZones();

  // Try exact match first
  let zone = zones.find((z) => z.name === domain);
  if (zone) return zone;

  // Try to find parent domain match (e.g., subdomain.example.com -> example.com)
  const parts = domain.split(".");
  while (parts.length > 1) {
    parts.shift();
    const parentDomain = parts.join(".");
    zone = zones.find((z) => z.name === parentDomain);
    if (zone) return zone;
  }

  return null;
}

export async function showErrorToast(message: string, error?: Error) {
  await showToast({
    style: Toast.Style.Failure,
    title: message,
    message: error?.message,
  });
}

export async function showSuccessToast(message: string) {
  await showToast({
    style: Toast.Style.Success,
    title: message,
  });
}
