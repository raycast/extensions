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

export interface Carrier {
  code: string;
  name: string;
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

export function getUserLanguage(): string {
  const preferences = getPreferenceValues<Preferences & { locale?: string }>();
  const locale = preferences.locale || "en";
  return locale.split("-")[0]; // Extract language code (e.g., "en" from "en-US")
}

export function getDeliveriesUrl(filterMode: FilterMode): string {
  return `https://api.parcel.app/external/deliveries/?filter_mode=${filterMode}`;
}

export function getAPIHeaders(): Record<string, string> {
  return {
    "api-key": getApiKey(),
  };
}

export function getSupportedCarriersUrl(): string {
  return "https://api.parcel.app/external/supported_carriers.json";
}

export async function fetchSupportedCarriers(): Promise<Carrier[]> {
  const response = await fetch(getSupportedCarriersUrl());
  if (!response.ok) {
    throw new Error(`Failed to load supported carriers: ${response.status}`);
  }

  const data = (await response.json()) as Record<string, string>;
  const carriers: Carrier[] = Object.entries(data).map(([code, name]) => ({ code, name }));

  carriers.sort((a, b) => a.name.localeCompare(b.name));
  return carriers;
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

export async function addDelivery(
  trackingNumber: string,
  carrierCode: string,
  description: string,
  language?: string,
): Promise<void> {
  const url = "https://api.parcel.app/external/add-delivery/";
  const response = await fetch(url, {
    headers: {
      ...getAPIHeaders(),
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify({
      tracking_number: trackingNumber,
      carrier_code: carrierCode,
      description: description,
      ...(language && { language }),
    }),
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status} (${await response.text()})`);
  }

  const data = (await response.json()) as ParcelApiResponse;

  const err = getAPIError(data);
  if (err) {
    throw err;
  }
}

export function getAPIError(data: ParcelApiResponse): Error | null {
  if (!data.success) {
    return new Error(data?.error_message || "Unknown API error");
  }

  return null;
}
