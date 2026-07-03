import {
  createBangIndex,
  FALLBACK_BANGS,
  parseHeliumBangList,
  resolveBangQuery,
  type HeliumBang,
  type ResolvedBang,
} from "./bang-resolver";
import { getHeliumServicesPreferences } from "./helium-profile";

const bangIndexPromises = new Map<string, Promise<Map<string, HeliumBang>>>();

export async function resolveHeliumBang(searchText: string): Promise<ResolvedBang | undefined> {
  const services = getHeliumServicesPreferences();
  if (!services.enabled || !services.bangs) return undefined;

  const index = await getBangIndex(services.origin);
  return resolveBangQuery(searchText, index);
}

export async function getBangIndex(origin: string): Promise<Map<string, HeliumBang>> {
  let indexPromise = bangIndexPromises.get(origin);
  if (!indexPromise) {
    indexPromise = fetchBangIndex(origin);
    bangIndexPromises.set(origin, indexPromise);
  }
  return indexPromise;
}

async function fetchBangIndex(origin: string): Promise<Map<string, HeliumBang>> {
  try {
    const response = await fetch(`${origin}/bangs.json`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      throw new Error(`Helium bangs returned HTTP ${response.status}`);
    }

    return createBangIndex(parseHeliumBangList(await response.text()));
  } catch (error) {
    console.error("[Helium] Failed to load official bangs, using bundled fallback:", error);
    return createBangIndex(FALLBACK_BANGS);
  }
}
