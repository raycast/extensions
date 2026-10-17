/**
 * Render Mode Resolver
 *
 * Pure helper that resolves the user's search-bar text into the two
 * renderable surfaces the unified OSINT Web Check command exposes:
 *   1. A "deep-dive" web check (DNS / SSL / ports / etc.) for any URL,
 *      domain, IP, or IPv6 input.
 *   2. A list of external OSINT platform lookups (VirusTotal, Shodan,
 *      AbuseIPDB, ...) keyed off the detected IOC type.
 *
 * No React imports, no I/O — safe to unit-test and reuse.
 */

import { addHttps } from "../utils/addHttps";
import { detectIOCType, refangIOC } from "../osint-ioc/utils/ioc-detection";
import { getEnabledSourcesForIOCType } from "../osint-ioc/utils/osint-sources";
import { IOCType, OSINTSource } from "../osint-ioc/ioc-types";

export interface RenderMode {
  /** The detected (refanged, normalized) IOC value, or empty string when no input. */
  ioc: string;
  /** The detected IOC type. "unknown" when input is empty or invalid. */
  iocType: IOCType;
  /** Absolute URL to feed the deep-dive check (DNS / SSL / ports / etc.). null for hashes & unknown. */
  deepDiveUrl: string | null;
  /** Whether the deep-dive check should run (mirrors `deepDiveUrl !== null`). */
  deepDiveEnabled: boolean;
  /** External OSINT platform entries filtered by preferences and IOC type. */
  osintSources: OSINTSource[];
}

const EMPTY: RenderMode = {
  ioc: "",
  iocType: "unknown",
  deepDiveUrl: null,
  deepDiveEnabled: false,
  osintSources: [],
};

/**
 * Resolve the render mode for a given raw search-bar input and the user's
 * preferences. Returns the empty mode for blank input; otherwise refangs,
 * detects the IOC type, and computes the deep-dive URL and the filtered
 * OSINT-source list.
 */
export function getRenderMode(raw: string, preferences: Record<string, unknown>): RenderMode {
  const trimmed = raw.trim();
  if (!trimmed) {
    return EMPTY;
  }

  const refanged = refangIOC(trimmed);
  const detection = detectIOCType(refanged);

  if (!detection.isValid || detection.type === "unknown") {
    return {
      ioc: detection.value,
      iocType: detection.type,
      deepDiveUrl: null,
      deepDiveEnabled: false,
      osintSources: [],
    };
  }

  let deepDiveUrl: string | null = null;
  if (detection.type === "url") {
    deepDiveUrl = detection.value;
  } else if (detection.type === "domain" || detection.type === "ip" || detection.type === "ipv6") {
    deepDiveUrl = addHttps(detection.value);
  }

  return {
    ioc: detection.value,
    iocType: detection.type,
    deepDiveUrl,
    deepDiveEnabled: deepDiveUrl !== null,
    osintSources: getEnabledSourcesForIOCType(detection.type, preferences),
  };
}
