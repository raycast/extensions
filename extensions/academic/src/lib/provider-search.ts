import type { SearchContext, SearchProvider, WorkResult } from "../types";

export async function searchProviderWithFallback(
  provider: SearchProvider,
  primaryQuery: string,
  context: SearchContext,
): Promise<WorkResult[]> {
  if (provider.handlesFallbackQueries)
    return provider.search(primaryQuery, context);

  let firstError: unknown;
  for (const query of uniqueQueries([
    primaryQuery,
    ...(context.fallbackQueries ?? []),
  ])) {
    try {
      const results = await provider.search(query, context);
      if (results.length) return results;
    } catch (error) {
      firstError ??= error;
    }
  }
  if (firstError) throw firstError;
  return [];
}

export function uniqueQueries(values: string[], excluded?: string): string[] {
  const seen = new Set(excluded ? [normalizeQuery(excluded)] : []);
  return values.flatMap((value) => {
    const trimmed = value.trim();
    const normalized = normalizeQuery(trimmed);
    if (trimmed.length < 2 || seen.has(normalized)) return [];
    seen.add(normalized);
    return [trimmed];
  });
}

function normalizeQuery(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}
