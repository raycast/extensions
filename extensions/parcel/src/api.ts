import { getPreferenceValues } from "@raycast/api";
import https from "https";

interface Preferences {
  apiKey: string;
}

interface Event {
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

interface ParcelApiResponse {
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

export async function fetchDeliveries(filterMode: "active" | "recent" = "active"): Promise<Delivery[]> {
  const preferences = getPreferenceValues<Preferences>();

  if (!preferences.apiKey) {
    throw new Error("API key not found. Please add your Parcel API key in extension preferences.");
  }

  const url = `https://api.parcel.app/external/deliveries/?filter_mode=${filterMode}`;

  return new Promise<Delivery[]>((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          "api-key": preferences.apiKey,
        },
      },
      (res) => {
        const chunks: Buffer[] = [];

        res.on("data", (chunk) => {
          chunks.push(chunk);
        });

        res.on("end", () => {
          const body = Buffer.concat(chunks).toString();

          if (res.statusCode !== 200) {
            reject(new Error(`API request failed with status ${res.statusCode}`));
            return;
          }

          try {
            const data = JSON.parse(body) as ParcelApiResponse;

            if (!data.success) {
              reject(new Error(data.error_message || "Unknown API error"));
              return;
            }

            resolve(data.deliveries);
          } catch (error) {
            console.error("Error parsing JSON:", error);
            reject(new Error("Invalid response from Parcel API"));
          }
        });
      },
    );

    req.on("error", (error) => {
      console.error("Error fetching deliveries:", error);
      reject(error);
    });

    req.end();
  });
}
