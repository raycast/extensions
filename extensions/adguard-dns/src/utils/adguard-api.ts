import { getPreferenceValues, LocalStorage } from "@raycast/api";

const ADGUARD_API_BASE = "https://api.adguard-dns.io";
const STORAGE_KEY_ACCESS_TOKEN = "adguard_access_token";
const STORAGE_KEY_REFRESH_TOKEN = "adguard_refresh_token";
const STORAGE_KEY_DEVICE_CACHE = "adguard_device_cache";
const DEVICE_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// In-memory token storage (persists for extension lifetime)
let currentAccessToken: string | null = null;
let currentRefreshToken: string | null = null;

export interface QueryLogItem {
  domain: string;
  time_iso: string;
  time_millis: number;
  filtering_info?: {
    filtering_status?: string;
    filter_rule?: string;
    filter_id?: string;
  };
  device_id?: string;
  dns_request_type?: string;
}

export interface QueryLogResponse {
  items: QueryLogItem[];
  pages: {
    current: number;
    total: number;
  };
}

export interface DNSServerSettings {
  user_rules_settings: {
    enabled: boolean;
    rules: string[];
    rules_count: number;
  };
}

export interface Device {
  id: string;
  name: string;
  dns_server_id?: string;
}

interface DeviceCache {
  devices: Record<string, string>; // Map of device ID to device name
  timestamp: number;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
}

/**
 * Get preferences values
 */
function getPrefs() {
  return getPreferenceValues();
}

/**
 * Initialize access token from LocalStorage or preferences
 */
async function initializeToken(): Promise<string> {
  if (!currentAccessToken) {
    // Try to load from LocalStorage first (persists between sessions)
    const storedToken = await LocalStorage.getItem<string>(STORAGE_KEY_ACCESS_TOKEN);
    if (storedToken) {
      currentAccessToken = storedToken;
    } else {
      // Fall back to preferences for initial setup
      const prefs = getPrefs();
      currentAccessToken = prefs.adguardApiToken as string;
      // Save to LocalStorage for future use
      await LocalStorage.setItem(STORAGE_KEY_ACCESS_TOKEN, currentAccessToken);
    }
  }
  return currentAccessToken as string;
}

/**
 * Get refresh token from LocalStorage or preferences
 */
async function getRefreshToken(): Promise<string> {
  if (!currentRefreshToken) {
    // Try to load from LocalStorage first
    const storedToken = await LocalStorage.getItem<string>(STORAGE_KEY_REFRESH_TOKEN);
    if (storedToken) {
      currentRefreshToken = storedToken;
    } else {
      // Fall back to preferences
      const prefs = getPrefs();
      currentRefreshToken = prefs.adguardRefreshToken;
      // Save to LocalStorage for future use
      if (currentRefreshToken) {
        await LocalStorage.setItem(STORAGE_KEY_REFRESH_TOKEN, currentRefreshToken);
      }
    }
  }

  if (!currentRefreshToken) {
    throw new Error("AdGuard refresh token is not configured. Please check extension preferences.");
  }

  return currentRefreshToken;
}

/**
 * Refreshes the access token using the refresh token
 */
async function refreshAccessToken(): Promise<string> {
  const refreshToken = await getRefreshToken();

  const response = await fetch(`${ADGUARD_API_BASE}/oapi/v1/oauth_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `refresh_token=${encodeURIComponent(refreshToken)}`,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to refresh token: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as TokenResponse;

  // Update in-memory token
  currentAccessToken = data.access_token;

  // Save new access token to LocalStorage (persists between sessions)
  await LocalStorage.setItem(STORAGE_KEY_ACCESS_TOKEN, data.access_token);

  // If a new refresh token was provided, save it too
  if (data.refresh_token) {
    currentRefreshToken = data.refresh_token;
    await LocalStorage.setItem(STORAGE_KEY_REFRESH_TOKEN, data.refresh_token);
    console.log("AdGuard API tokens refreshed successfully (including new refresh token)");
  } else {
    console.log("AdGuard API access token refreshed successfully");
  }

  return data.access_token;
}

/**
 * Makes an API call with automatic token refresh on 401
 */
export async function callAdGuardAPI(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await initializeToken();

  if (!token) {
    throw new Error("AdGuard API token is not configured. Please check extension preferences.");
  }

  // Add authorization header
  const requestOptions: RequestInit = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  };

  // Try the request
  let response = await fetch(url, requestOptions);

  // If unauthorized, refresh token and retry once
  if (response.status === 401) {
    console.log("Token expired, refreshing...");

    const newToken = await refreshAccessToken();

    // Retry with new token
    requestOptions.headers = {
      ...requestOptions.headers,
      Authorization: `Bearer ${newToken}`,
    };

    response = await fetch(url, requestOptions);
  }

  return response;
}

/**
 * Get the DNS server ID from preferences
 */
export function getDnsServerId(): string {
  const prefs = getPrefs();

  if (!prefs.adguardDnsServerId) {
    throw new Error("AdGuard DNS Server ID is not configured. Please check extension preferences.");
  }

  return prefs.adguardDnsServerId;
}

/**
 * Build AdGuard API URL
 */
export function buildApiUrl(path: string): string {
  return `${ADGUARD_API_BASE}${path}`;
}

/**
 * Fetch devices from AdGuard API with caching
 */
export async function getDeviceMap(): Promise<Record<string, string>> {
  // Try to get from cache first
  const cachedData = await LocalStorage.getItem<string>(STORAGE_KEY_DEVICE_CACHE);

  if (cachedData) {
    try {
      const cache = JSON.parse(cachedData) as DeviceCache;
      const now = Date.now();

      // Check if cache is still valid
      if (now - cache.timestamp < DEVICE_CACHE_DURATION) {
        return cache.devices;
      }
    } catch (error) {
      console.error("Failed to parse device cache:", error);
    }
  }

  // Cache is invalid or doesn't exist, fetch from API
  const url = buildApiUrl("/oapi/v1/devices");
  const response = await callAdGuardAPI(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch devices: ${response.status}`);
  }

  // API returns an array of Device objects
  const devices = (await response.json()) as Device[];

  // Build device map (ID -> name)
  const deviceMap: Record<string, string> = {};
  for (const device of devices) {
    deviceMap[device.id] = device.name;
  }

  // Save to cache
  const cache: DeviceCache = {
    devices: deviceMap,
    timestamp: Date.now(),
  };

  await LocalStorage.setItem(STORAGE_KEY_DEVICE_CACHE, JSON.stringify(cache));

  return deviceMap;
}

/**
 * Clear stored tokens (useful for troubleshooting or when switching accounts)
 */
export async function clearStoredTokens(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEY_ACCESS_TOKEN);
  await LocalStorage.removeItem(STORAGE_KEY_REFRESH_TOKEN);
  currentAccessToken = null;
  currentRefreshToken = null;
  console.log("Cleared stored AdGuard tokens");
}
