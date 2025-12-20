import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { WoltClient } from "wolt-api";
import type { City } from "wolt-api";

const LOCATION_KEY = "wolt-city-location-cache";
export const CITY_SLUG_KEY = "wolt-selected-city-slug";

export interface StoredLocation {
  city: City;
  latitude: string;
  longitude: string;
}

interface Preferences {
  citySlug: string;
}

export async function setCitySlug(citySlug: string): Promise<void> {
  await LocalStorage.setItem(CITY_SLUG_KEY, citySlug);
  // Clear location cache when city changes
  await LocalStorage.removeItem(LOCATION_KEY);
}

export async function getStoredLocation(): Promise<StoredLocation | null> {
  try {
    // Check LocalStorage first (set by browse-cities command), then fall back to preferences
    const storedSlug = await LocalStorage.getItem(CITY_SLUG_KEY);
    const preferences = getPreferenceValues<Preferences>();
    const citySlug = (storedSlug as string) || preferences.citySlug?.trim();

    if (!citySlug) {
      return null;
    }

    // Check cache first
    const cached = await LocalStorage.getItem(LOCATION_KEY);
    if (cached) {
      try {
        const cachedLocation = JSON.parse(cached as string) as StoredLocation;
        if (cachedLocation.city.slug === citySlug) {
          return cachedLocation;
        } else {
          // City changed, clear cache
          await LocalStorage.removeItem(LOCATION_KEY);
        }
      } catch {
        // Invalid cache, clear it
        await LocalStorage.removeItem(LOCATION_KEY);
      }
    }

    // Fetch city details from API
    const client = new WoltClient();
    const cities = await client.listCities();
    const city = cities.find((c) => c.slug === citySlug);

    if (!city) {
      console.warn(`City not found for slug: ${citySlug}`);
      return null;
    }

    // Validate city has location data
    if (!city.location || typeof city.location.lat !== "number" || typeof city.location.lon !== "number") {
      console.error(`City ${citySlug} missing valid location data:`, city);
      return null;
    }

    const latitude = city.location.lat.toString();
    const longitude = city.location.lon.toString();

    const location: StoredLocation = {
      city,
      latitude,
      longitude,
    };

    // Cache the location
    await LocalStorage.setItem(LOCATION_KEY, JSON.stringify(location));

    return location;
  } catch (error) {
    console.error("Error getting stored location:", error);
    return null;
  }
}
