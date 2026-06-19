import { getPreferenceValues } from "@raycast/api";
import type {
  ApiResponse,
  DeviceUsageApiResponse,
  ReferrerApiResponse,
  PageApiResponse,
  BrowserUsageApiResponse,
} from "../types";

const DEFAULT_DASHBOARD_URL = "https://app.bklit.com";
// API endpoints optimized with ClickHouse aggregation (~20-50ms warm, ~1-3s cold start)
// 15 second timeout provides margin for cold starts while failing fast on real issues
const FETCH_TIMEOUT_MS = 15000; // 15 seconds timeout

// Helper function to add timeout to fetch requests
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      const timeoutSeconds = Math.round(timeoutMs / 1000);
      throw new Error(`Request timeout after ${timeoutSeconds}s. The server may be experiencing high load.`);
    }
    throw error;
  }
}

// Helper function to make API requests with timing and error handling
async function makeApiRequest(
  endpoint: string,
  projectId: string,
  apiToken: string,
  endpointName: string,
): Promise<Response> {
  const startTime = Date.now();
  const response = await fetchWithTimeout(
    endpoint,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectId,
      }),
    },
    FETCH_TIMEOUT_MS,
  );

  const fetchTime = Date.now() - startTime;
  // ClickHouse-optimized endpoints: ~20-50ms warm, ~1-3s cold start
  if (fetchTime > 3000) {
    console.warn(`[API] Slow fetch for ${endpointName}: ${fetchTime}ms (cold start)`);
  } else if (fetchTime > 500) {
    console.log(`[API] ${endpointName} fetched in ${fetchTime}ms (warming up)`);
  } else {
    console.log(`[API] ${endpointName} fetched in ${fetchTime}ms`);
  }

  return response;
}

export async function fetchTopCountries(): Promise<ApiResponse> {
  const preferences = getPreferenceValues<Preferences>();
  const dashboardUrl = preferences.dashboardUrl || DEFAULT_DASHBOARD_URL;
  const endpoint = `${dashboardUrl}/api/raycast/top-countries`;

  try {
    const response = await makeApiRequest(endpoint, preferences.projectId, preferences.apiToken, "top-countries");

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}`;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }

    const data = (await response.json()) as ApiResponse;
    return data;
  } catch (error) {
    console.error("Error fetching top countries:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

export async function fetchDeviceUsage(): Promise<DeviceUsageApiResponse> {
  const preferences = getPreferenceValues<Preferences>();
  const dashboardUrl = preferences.dashboardUrl || DEFAULT_DASHBOARD_URL;
  const endpoint = `${dashboardUrl}/api/raycast/device-usage`;

  try {
    const response = await makeApiRequest(endpoint, preferences.projectId, preferences.apiToken, "device-usage");

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}`;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }

    const data = (await response.json()) as DeviceUsageApiResponse;
    return data;
  } catch (error) {
    console.error("Error fetching device usage:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

export async function fetchTopReferrers(): Promise<ReferrerApiResponse> {
  const preferences = getPreferenceValues<Preferences>();
  const dashboardUrl = preferences.dashboardUrl || DEFAULT_DASHBOARD_URL;
  const endpoint = `${dashboardUrl}/api/raycast/top-referrers`;

  try {
    const response = await makeApiRequest(endpoint, preferences.projectId, preferences.apiToken, "top-referrers");

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}`;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }

    const data = (await response.json()) as ReferrerApiResponse;
    return data;
  } catch (error) {
    console.error("Error fetching top referrers:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

export async function fetchTopPages(): Promise<PageApiResponse> {
  const preferences = getPreferenceValues<Preferences>();
  const dashboardUrl = preferences.dashboardUrl || DEFAULT_DASHBOARD_URL;
  const endpoint = `${dashboardUrl}/api/raycast/top-pages`;

  try {
    const response = await makeApiRequest(endpoint, preferences.projectId, preferences.apiToken, "top-pages");

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}`;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }

    const data = (await response.json()) as PageApiResponse;
    return data;
  } catch (error) {
    console.error("Error fetching top pages:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

export async function fetchBrowserUsage(): Promise<BrowserUsageApiResponse> {
  const preferences = getPreferenceValues<Preferences>();
  const dashboardUrl = preferences.dashboardUrl || DEFAULT_DASHBOARD_URL;
  const endpoint = `${dashboardUrl}/api/raycast/browser-usage`;

  try {
    const response = await makeApiRequest(endpoint, preferences.projectId, preferences.apiToken, "browser-usage");

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}`;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }

    const data = (await response.json()) as BrowserUsageApiResponse;
    return data;
  } catch (error) {
    console.error("Error fetching browser usage:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

// Combined fetch for all analytics data - runs requests in parallel
// This is more efficient than separate useCachedPromise calls
export interface AllAnalyticsData {
  countries: ApiResponse;
  deviceUsage: DeviceUsageApiResponse;
  referrers: ReferrerApiResponse;
  pages: PageApiResponse;
}

export async function fetchAllAnalytics(): Promise<AllAnalyticsData> {
  const startTime = Date.now();
  console.log("[API] Starting parallel fetch for all analytics...");

  const [countries, deviceUsage, referrers, pages] = await Promise.all([
    fetchTopCountries(),
    fetchDeviceUsage(),
    fetchTopReferrers(),
    fetchTopPages(),
  ]);

  const totalTime = Date.now() - startTime;
  console.log(`[API] All analytics fetched in ${totalTime}ms (parallel)`);

  return { countries, deviceUsage, referrers, pages };
}
