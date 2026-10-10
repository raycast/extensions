import { environment, LocalStorage } from "@raycast/api";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { LocateResult } from "./helper";

/** Where prayer times are calculated for. */
export interface StoredLocation {
  /** `city`: picked in the form. `current`: refreshed from location services before each prayer. */
  mode: "city" | "current";
  latitude: number;
  longitude: number;
  /** Display name, e.g. "Islamabad, Pakistan". */
  label: string;
  countryCode?: string;
  /** IANA zone reported by the geocoder, for display only; times use the Mac's zone. */
  timezone?: string;
  /** ISO time of the last fix in `current` mode. */
  updatedAt?: string;
}

/** A city from the bundled GeoNames list. */
export interface CityResult {
  /** `CC:index`, stable for a given cities.json. */
  id: string;
  name: string;
  admin1?: string;
  country?: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  population?: number;
}

const KEY = "location";
const LOCATED_FOR_KEY = "locatedForSlot";

/**
 * The saved location, if set.
 *
 * @returns Stored location.
 */
export async function readLocation(): Promise<StoredLocation | undefined> {
  const raw = await LocalStorage.getItem<string>(KEY);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as StoredLocation;
  } catch {
    return undefined;
  }
}

/**
 * Save the location.
 *
 * @param location - Location to store.
 */
export async function writeLocation(location: StoredLocation): Promise<void> {
  await LocalStorage.setItem(KEY, JSON.stringify(location));
}

/**
 * The slot id the last automatic location refresh ran for, so it runs once per prayer.
 *
 * @returns Slot id, if any.
 */
export function readLocatedFor(): Promise<string | undefined> {
  return LocalStorage.getItem<string>(LOCATED_FOR_KEY);
}

/**
 * Remember that the automatic refresh ran for a slot.
 *
 * @param slotId - Slot id.
 */
export function writeLocatedFor(slotId: string): Promise<void> {
  return LocalStorage.setItem(LOCATED_FOR_KEY, slotId);
}

type CityRow = [name: string, region: string, latitude: number, longitude: number, population: number];
let citiesCache: Record<string, CityRow[]> | undefined;

/**
 * Cities in a country from the bundled GeoNames list (places with 5,000+ people, CC BY 4.0),
 * sorted alphabetically. Works offline.
 *
 * @param countryCode - ISO 3166-1 alpha-2 code.
 * @param countryName - Display name to attach to each city.
 * @returns Cities, alphabetical.
 */
export async function loadCities(countryCode: string, countryName?: string): Promise<CityResult[]> {
  citiesCache ??= JSON.parse(await readFile(join(environment.assetsPath, "cities.json"), "utf8")) as Record<
    string,
    CityRow[]
  >;
  return (citiesCache[countryCode] ?? []).map(([name, region, latitude, longitude, population], index) => ({
    id: `${countryCode}:${index}`,
    name,
    admin1: region || undefined,
    country: countryName,
    countryCode,
    latitude,
    longitude,
    population,
  }));
}

/**
 * Great-circle distance between two points.
 *
 * @param a - First point.
 * @param b - Second point.
 * @returns Distance in kilometers.
 */
export function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/**
 * Label for a city result, e.g. "Rawalpindi, Punjab, Pakistan".
 *
 * @param city - City result.
 * @returns Display label.
 */
export function cityLabel(city: Pick<CityResult, "name" | "admin1" | "country">): string {
  return [city.name, city.admin1 !== city.name ? city.admin1 : undefined, city.country].filter(Boolean).join(", ");
}

/**
 * Turn a location fix into a stored `current` location.
 *
 * @param fix - Result from the helper's locate command.
 * @param now - Time of the fix.
 * @returns Stored location in `current` mode.
 */
export function locationFromFix(fix: LocateResult, now = new Date()): StoredLocation {
  const label =
    [fix.locality, fix.country].filter(Boolean).join(", ") || `${fix.latitude.toFixed(3)}, ${fix.longitude.toFixed(3)}`;
  return {
    mode: "current",
    latitude: fix.latitude,
    longitude: fix.longitude,
    label,
    countryCode: fix.countryCode,
    timezone: fix.timezone,
    updatedAt: now.toISOString(),
  };
}
