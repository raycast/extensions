import { LocalStorage, environment, getPreferenceValues } from "@raycast/api";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { lock } from "proper-lockfile";
import { useEffect, useState } from "react";
import { cachedCities, City, getCities } from "./skyfrom-api";
import { now, resolveTime, SkyTime } from "./time";

export type SkySelection = { city: City; time: SkyTime };

export type Favorite = {
  id: string;
  city: City;
  time: SkyTime;
  name: string;
};

type LocationState = { favorites: Favorite[]; recent: City[]; defaultFavorite?: string; defaultCity?: City };
const storageKey = "locations-v1";
const initial: LocationState = { favorites: [], recent: [] };
const listeners = new Set<(state: LocationState) => void>();
const regions = new Intl.DisplayNames(["en"], { type: "region" });

export function countryName(city: City) {
  return regions.of(city.country) ?? city.country;
}

export function normalize(query: string) {
  return query
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[\s,–—-]+/g, " ")
    .trim();
}

export function searchCities(cities: City[], query: string) {
  const normalized = normalize(query);
  if (!normalized) return [];
  const matches = cities.flatMap((city) => {
    const name = normalize(city.name);
    const slug = normalize(city.slug);
    const full = normalize(`${city.name} ${countryName(city)}`);
    const countryCode = `${name} ${city.country.toLowerCase()}`;
    if (normalized === name || normalized === slug || normalized === full || normalized === countryCode)
      return [{ city, rank: 0 }];
    if (name.startsWith(normalized) || slug.startsWith(normalized)) return [{ city, rank: 1 }];
    if (name.includes(normalized) || slug.includes(normalized) || full.startsWith(normalized))
      return [{ city, rank: 2 }];
    return [];
  });
  return matches.sort((a, b) => a.rank - b.rank || a.city.name.localeCompare(b.city.name)).map(({ city }) => city);
}

export async function findCity(value: string, cacheOnly = false) {
  const cities = await (cacheOnly ? cachedCities() : getCities());
  if (cacheOnly && !cities.length) return undefined;
  const query = normalize(value);
  const exact = cities.filter((city) =>
    [
      normalize(city.name),
      normalize(`${city.name} ${countryName(city)}`),
      normalize(`${city.name} ${city.country}`),
    ].includes(query),
  );
  const input = value.trim().toLowerCase();
  const slug = cities.find((city) => city.slug === input);
  if (slug && (exact.length === 0 || input.includes("-"))) return slug;
  if (exact.length === 1) return exact[0];
  if (exact.length > 1)
    throw new Error(`More than one city matches “${value}”. Choose the city in Explore Sky or include its country.`);
  throw new Error(`SkyFrom couldn’t find “${value}”. Check the spelling or choose a city in Explore Sky.`);
}

export async function readLocations(): Promise<LocationState> {
  const stored = await LocalStorage.getItem<string>(storageKey);
  if (!stored) return initial;
  return JSON.parse(stored);
}

export function useLocations() {
  const [state, setState] = useState<LocationState>(initial);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>();
  useEffect(() => {
    let active = true;
    let changed = false;
    const update = (next: LocationState) => {
      changed = true;
      setState(next);
    };
    listeners.add(update);
    readLocations()
      .then((stored) => {
        if (active && !changed) setState(stored);
      })
      .catch((error: unknown) => {
        if (active) setError(error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      listeners.delete(update);
    };
  }, []);
  return { ...state, isLoading, error };
}

async function changeLocations(update: (state: LocationState) => LocationState) {
  const directory = join(environment.supportPath, "locations");
  await mkdir(directory, { recursive: true });
  const release = await lock(directory, { retries: { retries: 4, minTimeout: 50, maxTimeout: 400 } });
  try {
    const state = update(await readLocations());
    await LocalStorage.setItem(storageKey, JSON.stringify(state));
    listeners.forEach((listener) => listener(state));
  } finally {
    await release();
  }
}

export function rememberCity(city: City) {
  return changeLocations((state) => ({
    ...state,
    recent: [city, ...state.recent.filter((item) => item.slug !== city.slug)].slice(0, 8),
  }));
}

export function favoriteId({ city, time }: SkySelection) {
  return JSON.stringify([city.slug, timeLabelKey(time)]);
}

function timeLabelKey(time: SkyTime) {
  if (time.kind === "now") return "now";
  if (time.kind === "fixed") return time.local;
  return [time.event, time.date ?? ""];
}

export function saveFavorite(favorite: Favorite) {
  return changeLocations((state) => ({
    ...state,
    favorites: [favorite, ...state.favorites.filter(({ id }) => id !== favorite.id)],
  }));
}

export function removeFavorite(id: string) {
  return changeLocations((state) => ({
    ...state,
    favorites: state.favorites.filter((favorite) => favorite.id !== id),
    defaultFavorite: id === state.defaultFavorite ? undefined : state.defaultFavorite,
  }));
}

export function useAsDefault(selection: { kind: "city"; city: City } | { kind: "favorite"; id: string }) {
  return changeLocations((state) =>
    selection.kind === "city"
      ? { ...state, defaultCity: selection.city, defaultFavorite: undefined }
      : { ...state, defaultFavorite: selection.id },
  );
}

function defaultFavorite(state: Pick<LocationState, "favorites" | "defaultFavorite">) {
  return state.favorites.find(({ id }) => id === state.defaultFavorite);
}

export async function getDefaultSelection({
  forceNow = false,
  override,
  cacheOnly = false,
  state,
}: {
  forceNow?: boolean;
  override?: string;
  cacheOnly?: boolean;
  state?: Pick<LocationState, "favorites" | "defaultCity" | "defaultFavorite">;
} = {}): Promise<SkySelection | undefined> {
  if (override?.trim()) {
    const city = await findCity(override.trim(), cacheOnly);
    return city && { city, time: now };
  }
  state ??= await readLocations();
  const favorite = defaultFavorite(state);
  if (favorite) return { city: favorite.city, time: forceNow ? now : favorite.time };
  const value = getPreferenceValues<Preferences>().defaultCity?.trim();
  const city = state.defaultCity ?? (value ? await findCity(value, cacheOnly) : undefined);
  return city && { city, time: now };
}

export async function requireSelection(override?: string, forceNow = false) {
  const selection = await getDefaultSelection({ override, forceNow });
  if (!selection) throw new Error("Choose a default city in Explore Sky or enter one in extension settings.");
  return { city: selection.city, local: resolveTime(selection.time, selection.city) };
}
