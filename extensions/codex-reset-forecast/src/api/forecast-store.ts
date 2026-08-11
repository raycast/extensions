import { Cache } from "@raycast/api";
import { z } from "zod";
import { forecastResponseSchema } from "./forecast-schema";
import type { ForecastSnapshot, ForecastStore } from "./forecast-client";

const CACHE_KEY = "forecast-snapshot-v1";

const snapshotSchema = z.object({
  response: forecastResponseSchema,
  etag: z.string().optional(),
  lastSuccessfulRequestAt: z.string().refine((value) => !Number.isNaN(Date.parse(value))),
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
    write(snapshot: ForecastSnapshot) {
      cache.set(CACHE_KEY, JSON.stringify(snapshot));
    },
  };
}

export const raycastForecastStore = createRaycastForecastStore();
