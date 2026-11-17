import { Cache } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useRef } from "react";
import { fetchForecasts, type ResortForecast } from "../lib/forecast";
import type { Resort } from "../types";

const FRESH_MS = 30 * 60 * 1000;
// Shared by all commands, so the menu bar and Search Resorts reuse each other's fetches.
const cache = new Cache({ namespace: "forecasts" });
// Parsed entries for this session, so switching back to a resort skips the disk read and JSON.parse.
const memory = new Map<string, Entry>();

type Entry = { fetchedAt: number; forecast: ResortForecast };

// Location and elevations are part of the key, so edited or overridden resorts refetch. Bump the
// version when the shape of a forecast changes, so older cached entries are ignored.
const VERSION = 2;
const keyFor = (r: Resort) => `v${VERSION}|${r.id}|${r.lat},${r.lon}|${r.baseElevation ?? ""}-${r.topElevation ?? ""}`;

function readEntry(resort: Resort): Entry | undefined {
  const key = keyFor(resort);
  let entry = memory.get(key);
  if (!entry) {
    const raw = cache.get(key);
    if (!raw) return undefined;
    entry = JSON.parse(raw) as Entry;
    memory.set(key, entry);
  }
  return entry;
}

/** The last cached forecast, however old, for showing instantly while a fresh one loads. */
export const peekForecast = (resort: Resort) => readEntry(resort)?.forecast;

/** Returns forecasts younger than maxAgeMs from the cache and fetches the rest in one batch. */
export async function getForecasts(resorts: Resort[], maxAgeMs = FRESH_MS): Promise<Record<string, ResortForecast>> {
  const result: Record<string, ResortForecast> = {};
  const stale: Resort[] = [];
  for (const resort of resorts) {
    const entry = readEntry(resort);
    if (entry && Date.now() - entry.fetchedAt < maxAgeMs) result[resort.id] = entry.forecast;
    else stale.push(resort);
  }
  if (stale.length === 0) return result;

  const fresh = await fetchForecasts(stale);
  for (const resort of stale) {
    const entry: Entry = { fetchedAt: Date.now(), forecast: fresh[resort.id] };
    memory.set(keyFor(resort), entry);
    cache.set(keyFor(resort), JSON.stringify(entry));
    result[resort.id] = entry.forecast;
  }
  return result;
}

/** Forecasts for a small set of resorts (favorites plus the selected one), keyed by resort id. */
export function useForecasts(resorts: Resort[], maxAgeMs = FRESH_MS) {
  const force = useRef(false);
  const { data, isLoading, error, revalidate } = useCachedPromise(
    (list: Resort[]) => {
      const maxAge = force.current ? 0 : maxAgeMs;
      force.current = false;
      return getForecasts(list, maxAge);
    },
    [resorts],
    { keepPreviousData: true },
  );

  const refresh = () => {
    force.current = true;
    revalidate();
  };

  return { forecasts: data ?? {}, isLoading, error, refresh };
}
