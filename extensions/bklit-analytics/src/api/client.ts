import { getPreferenceValues } from "@raycast/api";
import type {
  ApiResponse,
  DeviceUsageApiResponse,
  ReferrerApiResponse,
  PageApiResponse,
  BrowserUsageApiResponse,
} from "../types";

const DEFAULT_DASHBOARD_URL = "https://app.bklit.com";

export async function fetchTopCountries(): Promise<ApiResponse> {
  const preferences = getPreferenceValues<Preferences>();
  const dashboardUrl = preferences.dashboardUrl || DEFAULT_DASHBOARD_URL;
  const endpoint = `${dashboardUrl}/api/raycast/top-countries`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${preferences.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectId: preferences.projectId,
      }),
    });

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

    const data: ApiResponse = await response.json();
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
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${preferences.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectId: preferences.projectId,
      }),
    });

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

    const data: DeviceUsageApiResponse = await response.json();
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
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${preferences.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectId: preferences.projectId,
      }),
    });

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

    const data: ReferrerApiResponse = await response.json();
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
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${preferences.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectId: preferences.projectId,
      }),
    });

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

    const data: PageApiResponse = await response.json();
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
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${preferences.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectId: preferences.projectId,
      }),
    });

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

    const data: BrowserUsageApiResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching browser usage:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}
