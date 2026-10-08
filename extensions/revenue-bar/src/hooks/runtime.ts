import { Cache, getPreferenceValues } from "@raycast/api";
import { CACHE_KEYS, KeyValueStore, readJson, writeJson } from "../core/cache";
import { registerSecret } from "../core/errors";
import { FxRates, FxStore, getRates } from "../core/fx";
import { Http, createHttp } from "../core/http";
import { normalizeCurrency } from "../core/money";
import { RangeId, parseRangeId } from "../core/ranges";
import { ProviderPreferences } from "../providers/registry";

export type ExtensionPreferences = ProviderPreferences & {
  displayCurrency?: string;
  defaultRange?: string;
  licenseKey?: string;
};

/** Reads extension preferences and registers every secret for redaction before anything can log it. */
export function getExtensionPreferences(): ExtensionPreferences {
  const prefs = getPreferenceValues<ExtensionPreferences>();
  registerSecret(prefs.stripeApiKey);
  registerSecret(prefs.lemonSqueezyApiKey);
  registerSecret(prefs.gumroadAccessToken);
  registerSecret(prefs.paddleApiKey);
  registerSecret(prefs.licenseKey);
  return prefs;
}

export function displayCurrency(prefs: ExtensionPreferences): string {
  const code = normalizeCurrency(prefs.displayCurrency ?? "");
  return /^[A-Z]{3}$/.test(code) ? code : "USD";
}

export function defaultRangeId(prefs: ExtensionPreferences): RangeId {
  return parseRangeId(prefs.defaultRange, "today");
}

let sharedHttp: Http | undefined;
export function runtimeHttp(): Http {
  sharedHttp ??= createHttp();
  return sharedHttp;
}

const cache = new Cache();

export const raycastStore: KeyValueStore = {
  get: (key) => cache.get(key),
  set: (key, value) => cache.set(key, value),
  remove: (key) => cache.remove(key),
};

function isFxRates(value: unknown): value is FxRates {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.base === "string" && typeof v.fetchedAt === "number" && typeof v.rates === "object";
}

export const fxStore: FxStore = {
  get: (base) => readJson(raycastStore, CACHE_KEYS.fxRates(normalizeCurrency(base)), isFxRates),
  set: (rates) => writeJson(raycastStore, CACHE_KEYS.fxRates(rates.base), rates),
};

export function ratesFor(base: string) {
  return getRates(base, { http: runtimeHttp(), store: fxStore, now: Date.now });
}

/** The range last picked in the dashboard, shared with the CSV export. */
export function storeSelectedRange(id: RangeId): void {
  raycastStore.set(CACHE_KEYS.selectedRange, id);
}

export function selectedRange(fallback: RangeId): RangeId {
  return parseRangeId(raycastStore.get(CACHE_KEYS.selectedRange), fallback);
}
