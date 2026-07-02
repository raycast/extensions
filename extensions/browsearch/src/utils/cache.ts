export function isCacheStale(sourceMaxMtime: number, cachedMtime: number | null): boolean {
  return cachedMtime === null || sourceMaxMtime > cachedMtime;
}
