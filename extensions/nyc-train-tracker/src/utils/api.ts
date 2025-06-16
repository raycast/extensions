import {
  Station,
  Departure,
  ServiceAlert,
  ProcessedDeparture,
  ProcessedServiceAlert,
  FilterableSystem,
  ErrorResponse,
} from "../types";

const API_BASE_URL = "https://metroflow.ainslie.digital/api/v1";

class APIError extends Error {
  statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = "APIError";
    this.statusCode = statusCode;
  }
}

function isErrorResponse(data: unknown): data is ErrorResponse {
  if (typeof data !== "object" || data === null) return false;

  const candidate = data as Record<string, unknown>;

  return (
    "error" in candidate &&
    candidate.error !== null &&
    typeof candidate.error === "object" &&
    "message" in (candidate.error as Record<string, unknown>) &&
    typeof (candidate.error as Record<string, unknown>).message === "string"
  );
}

async function fetchFromWrapper<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`[Raycast API Util] Fetching from: ${url} (API Base: ${API_BASE_URL})`);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    // Check content type before parsing JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.error(`[API] Expected JSON response but got ${contentType} from ${url}`);
      throw new APIError(`Invalid response format received from server.`, response.status);
    }

    const data = await response.json();

    // Check if the response is an error response
    if (!response.ok) {
      if (isErrorResponse(data)) {
        throw new APIError(data.error.message || `HTTP error! status: ${response.status}`, response.status);
      }
      throw new APIError(`HTTP error! status: ${response.status}`, response.status);
    }

    // Check for error format in successful response
    if (isErrorResponse(data)) {
      throw new APIError(data.error.message, response.status);
    }

    return data as T;
  } catch (error) {
    console.error(`[API] Network or parsing error fetching ${url}:`, error);
    if (error instanceof APIError) {
      throw error;
    } else if (error instanceof Error) {
      throw new APIError(error.message);
    } else {
      throw new APIError("An unknown network error occurred.");
    }
  }
}

// --- API Functions ---

export async function fetchStations(
  query?: string,
  system?: FilterableSystem,
  forceRefresh: boolean = false,
): Promise<Station[]> {
  let endpoint = "/stations";
  const params = new URLSearchParams();
  if (query) {
    params.append("q", query);
  }
  // Append system ONLY if it's provided and not 'All'
  if (system) {
    params.append("system", system);
  }
  if (forceRefresh) {
    params.append("_", Date.now().toString());
  }

  const queryString = params.toString();
  if (queryString) {
    endpoint += `?${queryString}`;
  }

  return fetchFromWrapper<Station[]>(endpoint);
}

// Wrapper type for departures
export async function fetchDepartures(
  stationId: string,
  limitMinutes?: number, // Add optional limit parameter
  source?: "scheduled" | "realtime",
): Promise<ProcessedDeparture[]> {
  // Returns raw Departure[] with string dates
  if (!stationId) return [];

  let endpoint = `/departures/${stationId}`;

  const params = new URLSearchParams();
  if (limitMinutes && limitMinutes > 0) {
    params.append("limitMinutes", limitMinutes.toString());
  }
  if (source) {
    params.append("source", source);
  }
  const queryString = params.toString();
  endpoint += queryString ? `?${queryString}` : "";

  const rawDepartures = await fetchFromWrapper<Departure[]>(endpoint);

  const processedDepartures: ProcessedDeparture[] = rawDepartures.map((dep) => ({
    ...dep,
    departureTime: dep.departureTime ? new Date(dep.departureTime) : null,
    systemRouteId: dep.routeId ? `${dep.system}-${dep.routeId}` : "",
    delayMinutes: dep.delayMinutes ? Number(dep.delayMinutes) : null,
  }));

  return processedDepartures;
}

// Wrapper type for alerts
export async function fetchAlerts(
  targetLines?: string[], // Array of line identifiers (e.g., SystemId-RouteId)
  stationId?: string, // Optional station ID to filter by
): Promise<ProcessedServiceAlert[]> {
  // Construct endpoint with optional parameters
  const params = new URLSearchParams();
  if (targetLines && targetLines.length > 0) {
    params.append("lines", targetLines.join(","));
  }
  // Always get active alerts only
  params.append("activeNow", "true");
  // Always include human-friendly labels
  params.append("includeLabels", "true");

  if (stationId) {
    params.append("stationId", stationId);
  }
  const queryString = params.toString();
  const endpoint = `/alerts${queryString ? `?${queryString}` : ""}`;

  // Fetch raw data
  const rawAlerts = await fetchFromWrapper<ServiceAlert[]>(endpoint);

  // Convert date strings before returning
  const processedAlerts: ProcessedServiceAlert[] = rawAlerts.map((alert) => {
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (alert.startDate) {
      const potentialStartDate = new Date(alert.startDate);
      if (!isNaN(potentialStartDate.getTime())) {
        startDate = potentialStartDate;
      }
    }

    if (alert.endDate) {
      if (
        typeof alert.endDate === "string" &&
        (alert.endDate === "0" || alert.endDate === "-1" || alert.endDate.trim() === "")
      ) {
        endDate = undefined;
      } else {
        const potentialEndDate = new Date(alert.endDate);

        // If the date is epoch (1970-01-01), treat as no end date
        if (!isNaN(potentialEndDate.getTime()) && potentialEndDate.toISOString() !== "1970-01-01T00:00:00.000Z") {
          endDate = potentialEndDate;
        }
      }
    }

    return {
      ...alert,
      affectedLines: alert.affectedLines || [],
      affectedStations: alert.affectedStations || [],
      startDate: startDate,
      endDate: endDate,
    };
  });

  return processedAlerts;
}
