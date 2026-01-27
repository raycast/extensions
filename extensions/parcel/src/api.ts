import { getPreferenceValues, Icon } from "@raycast/api";

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

const STATUS_ICONS: Record<number, Icon> = {
  0: Icon.CheckCircle,
  1: Icon.Snowflake,
  2: Icon.Lorry,
  3: Icon.Box,
  4: Icon.Lorry,
  5: Icon.QuestionMark,
  6: Icon.Warning,
  7: Icon.ExclamationMark,
  8: Icon.Dot,
};

export function getStatusIcon(statusCode: number): Icon {
  return STATUS_ICONS[statusCode] || Icon.QuestionMark;
}

export function getApiKey(): string {
  const preferences = getPreferenceValues<Preferences>();

  if (!preferences.apiKey) {
    throw new Error("API key not found. Please add your Parcel API key in extension preferences.");
  }

  return preferences.apiKey;
}

function getSystemLanguage(): string {
  return Intl.DateTimeFormat().resolvedOptions().locale.slice(0, 2);
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

export async function fetchDeliveries(filterMode: FilterMode): Promise<Delivery[]> {
  const url = getDeliveriesUrl(filterMode);
  const response = await fetch(url, {
    headers: getAPIHeaders(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch deliveries: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ""}`,
    );
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
  confirmationNotification: boolean,
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
      send_push_confirmation: confirmationNotification,
      language: getSystemLanguage(),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Failed to add delivery: ${response.status} ${response.statusText}`;

    // Parse JSON error response for better error message
    try {
      const errorData = JSON.parse(errorText);
      if (errorData.error_message) {
        errorMessage = errorData.error_message;
      }
    } catch {
      // Otherwise use the raw error text
      if (errorText) {
        errorMessage = errorText;
      }
    }

    throw new Error(errorMessage);
  }

  const data = (await response.json()) as ParcelApiResponse;

  const err = getAPIError(data);
  if (err) {
    throw err;
  }
}

export function getAPIError(data: ParcelApiResponse): Error | null {
  if (!data.success) {
    return new Error(data?.error_message || "API request failed. Please check your API key and try again.");
  }

  return null;
}
