import { getPreferenceValues } from "@raycast/api";
import type {
  ApiResponse,
  DeviceUsageApiResponse,
  ReferrerApiResponse,
  PageApiResponse,
  BrowserUsageApiResponse,
} from "../types";

const DEFAULT_DASHBOARD_URL = "https://app.bklit.com";
// Increased timeout to 60 seconds since API can sometimes take 30+ seconds
// This prevents premature timeouts while still preventing infinite hangs
const FETCH_TIMEOUT_MS = 60000; // 60 seconds timeout

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
      throw new Error(`Request timeout after ${timeoutSeconds} seconds. The API may be slow - please try again.`);
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
  // Note: This API typically takes 8-12 seconds per endpoint (server-side performance)
  // Only warn if it's unusually slow (>15 seconds)
  if (fetchTime > 15000) {
    console.warn(`[API] Very slow fetch for ${endpointName}: ${fetchTime}ms`);
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
