import { Cache } from "@raycast/api";
import { z } from "zod";
import { forecastResponseSchema } from "./forecast-schema";
import type { ForecastSnapshot, ForecastStore } from "./forecast-client";

const CACHE_KEY = "forecast-snapshot-v1";
const LAST_SUCCESSFUL_REQUEST_KEY_PREFIX = "forecast-last-successful-request-v2";

const timestampSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)));

const snapshotSchema = z.object({
  response: forecastResponseSchema,
  etag: z.string().optional(),
  lastSuccessfulRequestAt: timestampSchema,
});

function lastSuccessfulRequestKey(snapshot: ForecastSnapshot): string {
  // Version-specific keys prevent a delayed 304 from replacing freshness
  // metadata for a newer 200 response without rewriting either snapshot.
  const identity = `${snapshot.etag ?? ""}\n${snapshot.response.fetchedAt}`;
  return `${LAST_SUCCESSFUL_REQUEST_KEY_PREFIX}:${encodeURIComponent(identity)}`;
}

function createRaycastForecastStore(cache = new Cache()): ForecastStore {
  return {
    read() {
      const serialized = cache.get(CACHE_KEY);
      if (!serialized) return undefined;

      try {
        return snapshotSchema.parse(JSON.parse(serialized));
      } catch {
        cache.remove(CACHE_KEY);
        return undefined;
      }
    },
    readLastSuccessfulRequestAt(snapshot: ForecastSnapshot) {
      const key = lastSuccessfulRequestKey(snapshot);
      const timestamp = cache.get(key);
      if (!timestamp) return undefined;

      try {
        return timestampSchema.parse(timestamp);
      } catch {
        cache.remove(key);
        return undefined;
      }
    },
    write(snapshot: ForecastSnapshot) {
      cache.set(CACHE_KEY, JSON.stringify(snapshot));
    },
    writeLastSuccessfulRequestAt(snapshot: ForecastSnapshot, timestamp: string) {
      cache.set(lastSuccessfulRequestKey(snapshot), timestamp);
    },
  };
}

export const raycastForecastStore = createRaycastForecastStore();
