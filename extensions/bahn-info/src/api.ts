import { TripResponse, StatusResponse, TrainInfo } from "./types";

const ICE_PORTAL_BASE_URL = "https://iceportal.de/api1/rs";

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = "APIError";
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

async function checkWiFiOnICEConnection(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(`${ICE_PORTAL_BASE_URL}/status`, 5000);
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function fetchWithTimeout(url: string, timeout = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Raycast-BahnInfo/1.0",
      },
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function fetchTripInfo(): Promise<TripResponse | null> {
  const isConnected = await checkWiFiOnICEConnection();
  if (!isConnected) {
    throw new NetworkError(
      "Please connect to the ICE WiFi network. Make sure you are connected to 'WIFIonICE' to view train information.",
    );
  }

  try {
    const response = await fetchWithTimeout(`${ICE_PORTAL_BASE_URL}/tripInfo/trip`);

    if (!response.ok) {
      if (response.status >= 500) {
        throw new APIError("ICE Portal service is temporarily unavailable. Please try again later.");
      }
      throw new APIError(`Trip info API error: ${response.status}`, response.status);
    }

    try {
      const data: TripResponse = await response.json();
      return data;
    } catch (jsonError) {
      throw new NetworkError("Please connect to the ICE WiFi. Make sure you are connected to 'WIFIonICE' network.");
    }
  } catch (error) {
    if (error instanceof APIError || error instanceof NetworkError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new NetworkError("Connection timeout. Please check your WIFIonICE connection.");
    }
    throw new NetworkError(
      `Network error: ${error instanceof Error ? error.message : "Unable to connect to ICE Portal"}`,
    );
  }
}

export async function fetchStatus(): Promise<StatusResponse | null> {
  try {
    const response = await fetchWithTimeout(`${ICE_PORTAL_BASE_URL}/status`, 5000);

    if (!response.ok) {
      if (response.status >= 500) {
        throw new APIError("ICE Portal service is temporarily unavailable. Please try again later.");
      }
      throw new APIError(`Status API error: ${response.status}`, response.status);
    }

    try {
      const data: StatusResponse = await response.json();
      return data;
    } catch (jsonError) {
      throw new NetworkError("Please connect to the ICE WiFi. Make sure you are connected to 'WIFIonICE' network.");
    }
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new NetworkError("Connection timeout. Please check your WIFIonICE connection.");
    }
    throw new NetworkError(
      "Unable to connect to ICE Portal. Please ensure you are connected to the 'WIFIonICE' network.",
    );
  }
}

export async function fetchTrainInfo(): Promise<TrainInfo> {
  try {
    const [tripResponse, statusResponse] = await Promise.allSettled([fetchTripInfo(), fetchStatus()]);

    const trip = tripResponse.status === "fulfilled" ? tripResponse.value?.trip || null : null;
    const status = statusResponse.status === "fulfilled" ? statusResponse.value : null;

    // Check for network connectivity issues first
    if (tripResponse.status === "rejected" && tripResponse.reason instanceof NetworkError) {
      return {
        trip: null,
        status: null,
        isOnTrain: false,
        error: tripResponse.reason.message,
      };
    }

    if (statusResponse.status === "rejected" && statusResponse.reason instanceof NetworkError) {
      return {
        trip: null,
        status: null,
        isOnTrain: false,
        error: statusResponse.reason.message,
      };
    }

    // Handle API errors
    const hasError = tripResponse.status === "rejected" || statusResponse.status === "rejected";
    const error = hasError
      ? tripResponse.status === "rejected"
        ? tripResponse.reason.message
        : statusResponse.status === "rejected"
          ? statusResponse.reason.message
          : undefined
      : undefined;

    return {
      trip,
      status,
      isOnTrain: trip !== null || status !== null,
      error,
    };
  } catch (error) {
    const errorMessage =
      error instanceof NetworkError ? error.message : error instanceof Error ? error.message : "Unknown error occurred";

    return {
      trip: null,
      status: null,
      isOnTrain: false,
      error: errorMessage,
    };
  }
}

export function formatDelay(delay: string | null): string {
  if (!delay) return "";

  // Handle PT format (e.g., "PT12M")
  const ptMatch = delay.match(/PT(\d+)M/);
  if (ptMatch) {
    const totalMinutes = parseInt(ptMatch[1], 10);

    if (totalMinutes < 60) {
      return `+${totalMinutes}m`;
    } else {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return minutes > 0 ? `+${hours}h${minutes}m` : `+${hours}h`;
    }
  }

  // Handle simple format (e.g., "+12")
  const simpleMatch = delay.match(/^\+(\d+)$/);
  if (simpleMatch) {
    const totalMinutes = parseInt(simpleMatch[1], 10);

    if (totalMinutes < 60) {
      return `+${totalMinutes}m`;
    } else {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return minutes > 0 ? `+${hours}h${minutes}m` : `+${hours}h`;
    }
  }

  return delay;
}

export function formatTime(timestamp: number | null): string {
  if (!timestamp) return "--:--";

  // ICE Portal returns timestamps in milliseconds (not seconds) in German local time
  // Since we're always in Germany, no timezone conversion needed
  const date = new Date(timestamp);
  return date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function calculateProgress(actualPosition: number, totalDistance: number): number {
  if (totalDistance === 0) return 0;
  return Math.min(100, Math.max(0, (actualPosition / totalDistance) * 100));
}
