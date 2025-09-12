import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  apiKey: string;
}

export enum FilterMode {
  ACTIVE = "active",
  RECENT = "recent",
}

export interface Event {
  event: string;
  date: string;
  location?: string;
  additional?: string;
}

export interface Delivery {
  carrier_code: string;
  description: string;
  status_code: number;
  tracking_number: string;
  events: Event[];
  extra_information?: string;
  date_expected?: string;
  date_expected_end?: string;
  timestamp_expected?: number;
  timestamp_expected_end?: number;
}

export interface ParcelApiResponse {
  success: boolean;
  error_message?: string;
  deliveries: Delivery[];
}

// Status code descriptions
export const STATUS_DESCRIPTIONS: Record<number, string> = {
  0: "Completed",
  1: "Frozen",
  2: "In Transit",
  3: "Ready for Pickup",
  4: "Out for Delivery",
  5: "Not Found",
  6: "Failed Delivery Attempt",
  7: "Exception",
  8: "Info Received",
};

export function getStatusDescription(statusCode: number): string {
  return STATUS_DESCRIPTIONS[statusCode] || "Unknown Status";
}

// Map status codes to icons
export const STATUS_ICONS: Record<number, string> = {
  0: "✅",
  1: "❄️",
  2: "🚚",
  3: "📦",
  4: "🚚",
  5: "❓",
  6: "⚠️",
  7: "⛔️",
  8: "ℹ️",
};

export function getApiKey(): string {
  const preferences = getPreferenceValues<Preferences>();

  if (!preferences.apiKey) {
    throw new Error("API key not found. Please add your Parcel API key in extension preferences.");
  }

  return preferences.apiKey;
}

export function getDeliveriesUrl(filterMode: FilterMode): string {
  return `https://api.parcel.app/external/deliveries/?filter_mode=${filterMode}`;
}

export function getAPIHeaders(): Record<string, string> {
  return {
    "api-key": getApiKey(),
  };
}

export async function fetchDeliveries(filterMode: FilterMode): Promise<Delivery[]> {
  const url = getDeliveriesUrl(filterMode);
  const response = await fetch(url, {
    headers: getAPIHeaders(),
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status} (${await response.text()})`);
  }

  const data = (await response.json()) as ParcelApiResponse;

  const err = getAPIError(data);
  if (err) {
    throw err;
  }

  return data.deliveries;
}

export function getAPIError(data: ParcelApiResponse): Error | null {
  if (!data.success) {
    return new Error(data?.error_message || "Unknown API error");
  }

  return null;
}
