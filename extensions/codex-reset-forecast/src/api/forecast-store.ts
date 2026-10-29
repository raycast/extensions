import { Cache } from "@raycast/api";
import { z } from "zod";
import { forecastResponseSchema, timestampSchema } from "./forecast-schema";
import type { ForecastStore } from "./forecast-client";

const cache = new Cache();
// Source-specific keys exclude the old provider's data and refresh state.
const CACHE_KEY = "codex-reset-com-snapshot-v2";
const REFRESH_KEY = "codex-reset-com-refresh-v1";
const refreshSchema = z.object({ nextRequestAt: timestampSchema, error: z.string().optional() });
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
  readRefreshState() {
    try {
      return refreshSchema.parse(JSON.parse(cache.get(REFRESH_KEY) ?? "null"));
    } catch {
      return undefined;
    }
  },
  writeRefreshState(state) {
    cache.set(REFRESH_KEY, JSON.stringify(state));
  },
};
