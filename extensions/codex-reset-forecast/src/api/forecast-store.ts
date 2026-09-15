import { Cache } from "@raycast/api";
import { z } from "zod";
import { forecastResponseSchema, timestampSchema } from "./forecast-schema";
import type { ForecastStore } from "./forecast-client";

const cache = new Cache();
const CACHE_KEY = "codexreset-snapshot";
const snapshotSchema = z.object({
  response: forecastResponseSchema,
  lastSuccessfulRequestAt: timestampSchema,
});

export const raycastForecastStore: ForecastStore = {
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
  write(snapshot) {
    cache.set(CACHE_KEY, JSON.stringify(snapshot));
  },
};
