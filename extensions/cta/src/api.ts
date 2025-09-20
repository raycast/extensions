import { showToast, Toast, Cache } from "@raycast/api";
import fetch from "node-fetch";
import {
  API_ENDPOINTS,
  BusPrediction,
  BusRoute,
  CTA_BUS_API_KEY,
  CTA_TRAIN_API_KEY,
  TrainArrival,
  BusDirection,
  BusStop,
} from "./config";

// Add cache configuration
const cache = new Cache();
const CACHE_DURATION = {
  PREDICTIONS: 60 * 1000, // 60 seconds for predictions
  ROUTES: 24 * 60 * 60 * 1000, // 24 hours for routes
  STOPS: 24 * 60 * 60 * 1000, // 24 hours for stops
  DIRECTIONS: 24 * 60 * 60 * 1000, // 24 hours for directions
};

// Add cache helper functions
function getCacheKey(endpoint: string, params: Record<string, string>) {
  return `cache_${endpoint}_${Object.entries(params).sort().join("_")}`;
}

async function getCachedData<T>(key: string, duration: number, fetchFn: () => Promise<T>): Promise<T> {
  const cached = cache.get(key);
  if (cached) {
    const { timestamp, data } = JSON.parse(cached);
    if (Date.now() - timestamp < duration) {
      return data;
    }
  }

  const data = await fetchFn();
  cache.set(
    key,
    JSON.stringify({
      timestamp: Date.now(),
      data,
    }),
  );
  return data;
}

export async function getBusRoutes(): Promise<BusRoute[]> {
  const cacheKey = getCacheKey("routes", {});

  return getCachedData(cacheKey, CACHE_DURATION.ROUTES, async () => {
    try {
      const response = await fetch(`${API_ENDPOINTS.bus.routes}?key=${CTA_BUS_API_KEY}&format=json`);
      const data = await response.json();
      return data["bustime-response"].routes || [];
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch bus routes",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      return [];
    }
  });
}

export async function getBusPredictions(stopId: string): Promise<BusPrediction[]> {
  const cacheKey = getCacheKey("predictions", { stopId });

  return getCachedData(cacheKey, CACHE_DURATION.PREDICTIONS, async () => {
    try {
      // Validate stop ID format - silently return empty array for non-numeric IDs
      if (!/^\d+$/.test(stopId)) {
        return [];
      }

      const url = `${API_ENDPOINTS.bus.predictions}?key=${CTA_BUS_API_KEY}&stpid=${stopId}&format=json`;
      console.log("Fetching predictions from:", url);

      const response = await fetch(url);
      const data = await response.json();

      console.log("API Response:", JSON.stringify(data, null, 2));

      // Check for API error messages
      if (data["bustime-response"].error) {
        const error = data["bustime-response"].error[0];

        // Only show toast for specific API errors, not for "No data found"
        if (error.msg !== "No data found for parameter") {
          showToast({
            style: Toast.Style.Failure,
            title: "Bus API Error",
            message: error.msg,
          });
        }
        return [];
      }

      // Check if predictions exist
      const predictions = data["bustime-response"].prd;
      if (!predictions) {
        // Don't show toast for no predictions, as this is expected for many searches
        return [];
      }

      return predictions;
    } catch (error) {
      console.error("Error fetching bus predictions:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch bus predictions",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      return [];
    }
  });
}

export async function getTrainArrivals(stationId: string): Promise<TrainArrival[]> {
  const cacheKey = getCacheKey("arrivals", { stationId });

  return getCachedData(cacheKey, CACHE_DURATION.PREDICTIONS, async () => {
    try {
      const response = await fetch(
        `${API_ENDPOINTS.train.arrivals}?key=${CTA_TRAIN_API_KEY}&mapid=${stationId}&outputType=JSON`,
      );
      const data = await response.json();
      return data.ctatt?.eta || [];
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch train arrivals",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      return [];
    }
  });
}

export async function getBusDirections(routeId: string): Promise<BusDirection[]> {
  const cacheKey = getCacheKey("directions", { routeId });

  return getCachedData(cacheKey, CACHE_DURATION.DIRECTIONS, async () => {
    try {
      const response = await fetch(`${API_ENDPOINTS.bus.directions}?key=${CTA_BUS_API_KEY}&rt=${routeId}&format=json`);
      const data = await response.json();
      return data["bustime-response"].directions || [];
    } catch (error) {
      console.error("Error fetching bus directions:", error);
      return [];
    }
  });
}

export async function getBusStops(routeId: string, direction: string): Promise<BusStop[]> {
  const cacheKey = getCacheKey("stops", { routeId, direction });

  return getCachedData(cacheKey, CACHE_DURATION.STOPS, async () => {
    try {
      const encodedDirection = encodeURIComponent(direction);
      const url = `${API_ENDPOINTS.bus.stops}?key=${CTA_BUS_API_KEY}&rt=${routeId}&dir=${encodedDirection}&format=json`;
      console.log("Fetching bus stops from:", url); // Debug log

      const response = await fetch(url);
      const data = await response.json();

      // Debug log
      console.log("Bus stops API response:", JSON.stringify(data, null, 2));

      if (data["bustime-response"].error) {
        console.error("API Error:", data["bustime-response"].error);
        return [];
      }

      const stops = data["bustime-response"].stops;
      if (!stops) {
        console.log("No stops found in response");
        return [];
      }

      // Sort stops alphabetically by name
      return stops.sort((a: BusStop, b: BusStop) => a.stpnm.localeCompare(b.stpnm));
    } catch (error) {
      console.error("Error fetching bus stops:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch bus stops",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      return [];
    }
  });
}

export async function getBusRoutesByStop(stopId: string): Promise<string[]> {
  const cacheKey = getCacheKey("routesByStop", { stopId });

  return getCachedData(
    cacheKey,
    CACHE_DURATION.PREDICTIONS, // Use predictions duration since this uses prediction endpoint
    async () => {
      try {
        const response = await fetch(
          `${API_ENDPOINTS.bus.predictions}?key=${CTA_BUS_API_KEY}&stpid=${stopId}&format=json`,
        );
        const data = await response.json();

        if (data["bustime-response"].error) {
          return [];
        }

        const predictions = data["bustime-response"].prd || [];
        const routes = [...new Set(predictions.map((p: BusPrediction) => p.rt))];
        return routes.sort();
      } catch (error) {
        console.error("Error fetching bus routes for stop:", error);
        return [];
      }
    },
  );
}

// Update the clearExpiredCache function to use Cache API
export function clearExpiredCache() {
  try {
    const now = Date.now();
    // Get all cache entries by trying common prefixes
    const prefixes = ["predictions_", "routes_", "stops_", "directions_", "arrivals_", "routesByStop_"];

    for (const prefix of prefixes) {
      const key = `cache_${prefix}`;
      const cached = cache.get(key);
      if (cached) {
        try {
          const { timestamp } = JSON.parse(cached);
          const duration =
            prefix.includes("predictions") || prefix.includes("arrivals")
              ? CACHE_DURATION.PREDICTIONS
              : CACHE_DURATION.ROUTES;

          if (now - timestamp > duration) {
            cache.remove(key);
          }
        } catch (e) {
          // If we can't parse the cache entry, remove it
          cache.remove(key);
        }
      }
    }
  } catch (error) {
    console.error("Error clearing cache:", error);
  }
}
