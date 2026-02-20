import { AlAdhanData } from "./types";

const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

interface CacheEntry {
  data: AlAdhanData;
  timestamp: number;
}

const memoryCache: Record<string, CacheEntry> = {};

function getCacheKey(
  city: string,
  country: string,
  method: string,
  school: string,
): string {
  const today = new Date();
  const date = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  return `prayer-${city}-${country}-${method}-${school}-${date}`;
}

function getTodayDateStr(): string {
  const today = new Date();
  return `${String(today.getDate()).padStart(2, "0")}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;
}

export async function fetchPrayerTimes(
  city: string,
  country: string,
  method: string,
  school: string,
): Promise<AlAdhanData> {
  const cacheKey = getCacheKey(city, country, method, school);
  const cached = memoryCache[cacheKey];

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const dateStr = getTodayDateStr();
  const url =
    `https://api.aladhan.com/v1/timingsByCity/${dateStr}` +
    `?city=${encodeURIComponent(city)}` +
    `&country=${encodeURIComponent(country)}` +
    `&method=${method}` +
    `&school=${school}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Network error: ${response.status} ${response.statusText}`);
  }

  // The API may return a 200 with an error message instead of data
  const json = await response.json();

  if (json.code !== 200) {
    throw new Error(`AlAdhan API error: ${json.status ?? "Unknown error"}`);
  }

  if (!json.data || typeof json.data !== "object" || !json.data.timings) {
    throw new Error(
      `City "${city}", ${country} not found. Please check your preferences.`,
    );
  }

  const data = json.data as AlAdhanData;
  memoryCache[cacheKey] = { data, timestamp: Date.now() };
  return data;
}
