/** No @raycast/api import here: that package has no entry point outside the
 * Raycast runtime, and importing it would make this logic untestable. */

export const DEFAULT_TIMEOUT_MS = 3500;
const MIN_TIMEOUT_MS = 250;
const MAX_TIMEOUT_MS = 30_000;

export interface RawPreferences {
  readonly detectorUrl?: string;
  readonly detectorTimeoutMs?: string;
  readonly authToken?: string;
  readonly phoneRegions?: string;
  readonly maskPersons?: boolean;
  readonly maskLocations?: boolean;
  readonly maskOrganizations?: boolean;
}

export interface Settings {
  readonly detectorUrl: string;
  readonly detectorTimeoutMs: number;
  readonly authToken: string;
  readonly phoneRegions: readonly string[];
  readonly maskPersons: boolean;
  readonly maskLocations: boolean;
  readonly maskOrganizations: boolean;
}

export function parseTimeout(raw: string | undefined): number {
  const parsed = Number.parseInt((raw ?? "").trim(), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_TIMEOUT_MS;
  return Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, parsed));
}

/** Anything that is not a two-letter code is dropped rather than sent: the
 * detector answers a bad region list with a silent empty result. */
export function parsePhoneRegions(raw: string | undefined): string[] {
  const seen = new Set<string>();
  for (const part of (raw ?? "").split(",")) {
    const region = part.trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(region)) seen.add(region);
  }
  return [...seen];
}

export function toSettings(raw: RawPreferences): Settings {
  const url = (raw.detectorUrl ?? "").trim();
  return {
    detectorUrl: url.length > 0 ? url : "http://127.0.0.1:5002",
    detectorTimeoutMs: parseTimeout(raw.detectorTimeoutMs),
    authToken: (raw.authToken ?? "").trim(),
    phoneRegions: parsePhoneRegions(raw.phoneRegions),
    maskPersons: raw.maskPersons !== false,
    maskLocations: raw.maskLocations !== false,
    maskOrganizations: raw.maskOrganizations !== false,
  };
}
