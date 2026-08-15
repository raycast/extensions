import { Cache } from "@raycast/api";
import { z } from "zod";
import { forecastResponseSchema } from "./forecast-schema";
import type { ForecastSnapshot, ForecastStore } from "./forecast-client";

const CACHE_KEY = "forecast-snapshot-v1";
const LAST_SUCCESSFUL_REQUEST_KEY = "forecast-last-successful-request-v1";

const timestampSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)));

const snapshotSchema = z.object({
  response: forecastResponseSchema,
  etag: z.string().optional(),
  lastSuccessfulRequestAt: timestampSchema,
});

const lastSuccessfulRequestSchema = z.object({
  at: timestampSchema,
});

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
    readLastSuccessfulRequestAt() {
      const serialized = cache.get(LAST_SUCCESSFUL_REQUEST_KEY);
      if (!serialized) return undefined;

      try {
        const record = lastSuccessfulRequestSchema.parse(JSON.parse(serialized));
        return record.at;
      } catch {
        cache.remove(LAST_SUCCESSFUL_REQUEST_KEY);
        return undefined;
      }
    },
    write(snapshot: ForecastSnapshot) {
      cache.set(CACHE_KEY, JSON.stringify(snapshot));
    },
    writeLastSuccessfulRequestAt(timestamp: string) {
      cache.set(LAST_SUCCESSFUL_REQUEST_KEY, JSON.stringify({ at: timestamp }));
    },
  };
}

export const raycastForecastStore = createRaycastForecastStore();
