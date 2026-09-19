/**
 * Raycast hands every textfield preference back as a string, including the ones that are
 * numbers, and it does not validate them. A preference that fails to parse must not be able to
 * turn into a zero-second cache TTL or a zero-millisecond timeout, so each one is parsed and
 * clamped into a range that still produces a working extension.
 */

export interface NumericPreferences {
  cacheTtlSeconds: number;
  requestTimeoutSeconds: number;
  probeTimeoutSeconds: number;
  maxResults: number;
}

export type RawNumericPreferences = Partial<Record<keyof NumericPreferences, string>>;

interface Bounds {
  min: number;
  max: number;
  fallback: number;
}

export const PREFERENCE_BOUNDS: Record<keyof NumericPreferences, Bounds> = {
  cacheTtlSeconds: { min: 5, max: 3600, fallback: 60 },
  requestTimeoutSeconds: { min: 3, max: 120, fallback: 15 },
  probeTimeoutSeconds: { min: 1, max: 30, fallback: 4 },
  // Beyond a couple of hundred rows the Raycast list itself is what gets slow, not the search.
  maxResults: { min: 10, max: 200, fallback: 60 },
};

function clamp(raw: string | undefined, bounds: Bounds): number {
  if (raw === undefined) {
    return bounds.fallback;
  }
  const parsed = Number(raw.trim());
  if (raw.trim().length === 0 || !Number.isFinite(parsed)) {
    return bounds.fallback;
  }
  return Math.min(bounds.max, Math.max(bounds.min, Math.round(parsed)));
}

export function clampPreferences(raw: RawNumericPreferences): NumericPreferences {
  return {
    cacheTtlSeconds: clamp(raw.cacheTtlSeconds, PREFERENCE_BOUNDS.cacheTtlSeconds),
    requestTimeoutSeconds: clamp(raw.requestTimeoutSeconds, PREFERENCE_BOUNDS.requestTimeoutSeconds),
    probeTimeoutSeconds: clamp(raw.probeTimeoutSeconds, PREFERENCE_BOUNDS.probeTimeoutSeconds),
    maxResults: clamp(raw.maxResults, PREFERENCE_BOUNDS.maxResults),
  };
}
