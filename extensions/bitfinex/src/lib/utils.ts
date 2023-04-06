import { Cache } from "@raycast/api";
import { CACHE_NAMESPACE, ACTIVE_OFFERS_CACHE_KEY } from "./constants";

export function formatToYearlyRate(rate: number): string {
  return (rate * 365 * 100).toFixed(2);
}

export function formatToDailyRate(rate: number): string {
  return (rate * 100).toFixed(5);
}

export function getOfferClosedDate(offer: any) {
  const { period } = offer;
  const opened = new Date(offer.mtsOpening);
  const closedDate = opened.getTime() + period * 24 * 60 * 60 * 1000;

  return closedDate;
}

const cache = new Cache({
  namespace: CACHE_NAMESPACE,
});

export function getCachedActiveOffers() {
  return JSON.parse(cache.get(ACTIVE_OFFERS_CACHE_KEY) || "[]") as any[];
}

export function setCachedActiveOffers(activeOffers: any[]) {
  return cache.set(ACTIVE_OFFERS_CACHE_KEY, JSON.stringify(activeOffers));
}
