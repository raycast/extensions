export interface ProviderHealth {
  id: string;
  name: string;
  indicator: string;
  fetched_at: number;
}

const SEVERITY: Record<string, number> = {
  critical: 4,
  major: 3,
  minor: 2,
  unknown: 1,
  none: 0,
};

export function sortProviders<T extends ProviderHealth>(providers: T[]): T[] {
  return [...providers].sort((left, right) => {
    const severity =
      (SEVERITY[right.indicator] ?? 1) - (SEVERITY[left.indicator] ?? 1);
    return severity || left.name.localeCompare(right.name);
  });
}

export function statusFreshness(
  fetchedAt: number,
  now = Math.floor(Date.now() / 1000),
): string {
  if (!fetchedAt) return "Never updated";
  const seconds = Math.max(0, now - fetchedAt);
  const relative =
    seconds < 60
      ? `${seconds}s ago`
      : seconds < 3600
        ? `${Math.floor(seconds / 60)}m ago`
        : `${Math.floor(seconds / 3600)}h ago`;
  return seconds > 30 * 60 ? `Stale · ${relative}` : `Updated ${relative}`;
}

export function compactHistoryIndicators(
  indicators: string[],
  maxBuckets = 12,
): string[] {
  if (indicators.length <= maxBuckets) return [...indicators];
  const bucketSize = Math.ceil(indicators.length / maxBuckets);
  const severity: Record<string, number> = {
    critical: 4,
    major: 3,
    minor: 2,
    unknown: 1,
    none: 0,
  };
  const compacted: string[] = [];
  for (let start = 0; start < indicators.length; start += bucketSize) {
    const bucket = indicators.slice(start, start + bucketSize);
    compacted.push(
      bucket.reduce((worst, value) =>
        (severity[value] ?? 1) > (severity[worst] ?? 1) ? value : worst,
      ),
    );
  }
  return compacted;
}
