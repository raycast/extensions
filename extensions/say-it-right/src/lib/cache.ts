import { Cache } from "@raycast/api";
import { ProsodyAnalysisSchema, type ProsodyAnalysis } from "../types";
import { analysisCacheKey } from "./cache-key";

export { analysisCacheKey };

const cache = new Cache({ namespace: "analysis" });

export function readAnalysisCache(key: string): ProsodyAnalysis | null {
  const raw = cache.get(key);
  if (!raw) return null;
  try {
    const parsed = ProsodyAnalysisSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function writeAnalysisCache(
  key: string,
  analysis: ProsodyAnalysis,
): void {
  cache.set(key, JSON.stringify(analysis));
}
