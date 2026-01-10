import { useState, useEffect } from "react";
import { Cache, getPreferenceValues } from "@raycast/api";

export type PrayerTime = {
  name: string;
  time: Date;
};

export type PrayerTimesData = {
  Fajr: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  Sunrise: string;
};

export type AladhanResponse = {
  code: number;
  status: string;
  data: {
    timings: PrayerTimesData;
    date: {
      readable: string;
    };
  };
};

export const PRAYER_NAMES = {
  Fajr: "Fajr",
  Sunrise: "Sunrise",
  Dhuhr: "Dhuhr",
  Asr: "Asr",
  Maghrib: "Maghrib",
  Isha: "Isha",
};

export const ATHAN_DURATION = 5 * 60 * 1000;

const cache = new Cache();

// Hook for current time - updates every minute normally, every second in the last minute
// Set skipUpdates=true for icon-only mode where live updates aren't needed
export function useCurrentTime(nextPrayerTime?: Date, skipUpdates = false): Date {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    if (skipUpdates) return;

    const tick = () => {
      const now = new Date();
      setTime(now);

      // Calculate time until next prayer
      const diff = nextPrayerTime ? nextPrayerTime.getTime() - now.getTime() : Infinity;

      // Update every second if < 1 minute, otherwise every minute
      const nextInterval = diff > 0 && diff < 60000 ? 1000 : 60000;

      timeoutId = setTimeout(tick, nextInterval);
    };

    let timeoutId = setTimeout(tick, 1000);
    return () => clearTimeout(timeoutId);
  }, [nextPrayerTime?.getTime(), skipUpdates]);

  return time;
}

// Get today's date key for caching
function getTodayDateKey(): string {
  const today = new Date();
  return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
}

// Hook for fetching and managing prayer times with smart caching
// Only fetches from API once per day or when settings change
export function usePrayerTimes() {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPrayerTimes() {
      setError(null);

      try {
        const cachedCity = cache.get("city");
        const cachedMethod = cache.get("calculationMethod");
        const prefs = getPreferenceValues<Preferences>();

        const city = cachedCity || prefs.city;
        const methodStr = cachedMethod || prefs.calculationMethod || "2";
        const method = parseInt(methodStr);

        if (!city) {
          setError("Please set your city in settings");
          setIsLoading(false);
          return;
        }

        // Check if we have valid cached data for today
        const todayKey = getTodayDateKey();
        const cachedDate = cache.get("prayerTimesDate");
        const cachedCityKey = cache.get("prayerTimesCity");
        const cachedMethodKey = cache.get("prayerTimesMethod");
        const cachedTimes = cache.get("lastPrayerTimes");

        // Use cache if it's for today with same settings
        if (cachedDate === todayKey && cachedCityKey === city && cachedMethodKey === methodStr && cachedTimes) {
          try {
            const parsed = JSON.parse(cachedTimes) as Array<{ name: string; time: string }>;
            const prayers = parsed.map((p) => ({ name: p.name, time: new Date(p.time) }));
            setPrayerTimes(prayers);
            setIsLoading(false);
            return;
          } catch {
            // Cache parse failed, fetch fresh
          }
        }

        setIsLoading(true);
        const timings = await fetchPrayerTimesByAddress(city, method);

        if (!timings) {
          // Try to use stale cached prayer times on failure
          if (cachedTimes) {
            try {
              const parsed = JSON.parse(cachedTimes) as Array<{ name: string; time: string }>;
              const prayers = parsed.map((p) => ({ name: p.name, time: new Date(p.time) }));
              setPrayerTimes(prayers);
              setIsLoading(false);
              return;
            } catch {
              // Cache parse failed, show error
            }
          }
          setError("Failed to fetch prayer times");
          setIsLoading(false);
          return;
        }

        const today = new Date();
        const prayers: PrayerTime[] = [
          { name: PRAYER_NAMES.Fajr, time: parsePrayerTime(timings.Fajr, today) },
          { name: PRAYER_NAMES.Sunrise, time: parsePrayerTime(timings.Sunrise, today) },
          { name: PRAYER_NAMES.Dhuhr, time: parsePrayerTime(timings.Dhuhr, today) },
          { name: PRAYER_NAMES.Asr, time: parsePrayerTime(timings.Asr, today) },
          { name: PRAYER_NAMES.Maghrib, time: parsePrayerTime(timings.Maghrib, today) },
          { name: PRAYER_NAMES.Isha, time: parsePrayerTime(timings.Isha, today) },
        ].sort((a, b) => a.time.getTime() - b.time.getTime());

        // Cache with date and settings info
        cache.set(
          "lastPrayerTimes",
          JSON.stringify(prayers.map((p) => ({ name: p.name, time: p.time.toISOString() }))),
        );
        cache.set("prayerTimesDate", todayKey);
        cache.set("prayerTimesCity", city);
        cache.set("prayerTimesMethod", methodStr);

        setPrayerTimes(prayers);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    loadPrayerTimes();

    // Check every hour if we need to refresh (e.g., day changed at midnight)
    const interval = setInterval(
      () => {
        const todayKey = getTodayDateKey();
        const cachedDate = cache.get("prayerTimesDate");
        if (cachedDate !== todayKey) {
          loadPrayerTimes();
        }
      },
      60 * 60 * 1000,
    );

    return () => clearInterval(interval);
  }, []);

  const nextPrayer = getNextPrayer(prayerTimes);

  return { prayerTimes, nextPrayer, isLoading, error };
}

export async function fetchPrayerTimesByAddress(address: string, method: number = 2): Promise<PrayerTimesData | null> {
  try {
    const coords = await getCoordinatesFromCity(address);
    if (!coords) {
      throw new Error("Could not find coordinates for the specified address");
    }
    return await fetchPrayerTimes(coords.lat, coords.lng, method);
  } catch (error) {
    console.error("Error fetching prayer times:", error);
    return null;
  }
}

export async function fetchPrayerTimes(lat: number, lng: number, method: number = 2): Promise<PrayerTimesData | null> {
  try {
    const today = new Date();
    const timestamp = Math.floor(today.getTime() / 1000);
    const url = `http://api.aladhan.com/v1/timings/${timestamp}?latitude=${lat}&longitude=${lng}&method=${method}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch prayer times");

    const data = (await response.json()) as AladhanResponse;
    if (data.code !== 200) throw new Error(data.status);

    return data.data.timings;
  } catch (error) {
    console.error("Error fetching prayer times:", error);
    return null;
  }
}

export async function getCoordinatesFromCity(city: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}&limit=1`,
    );
    const data = (await response.json()) as Array<{ lat: string; lon: string }>;
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching coordinates:", error);
    return null;
  }
}

export function parsePrayerTime(timeString: string, date: Date): Date {
  const [hours, minutes] = timeString.split(":").map(Number);
  const prayerTime = new Date(date);
  prayerTime.setHours(hours, minutes, 0, 0);
  return prayerTime;
}

export function getNextPrayer(prayerTimes: PrayerTime[]): PrayerTime | null {
  if (prayerTimes.length === 0) return null;

  const now = new Date();

  for (const prayer of prayerTimes) {
    const diff = prayer.time.getTime() - now.getTime();
    if (diff > ATHAN_DURATION) {
      return prayer;
    }
  }

  return prayerTimes[0];
}

export function formatTimeRemaining(targetTime: Date): string {
  const now = new Date();
  let diff = targetTime.getTime() - now.getTime();

  if (diff <= 1000) {
    diff += 24 * 60 * 60 * 1000;
  }

  if (diff <= 0) {
    diff = 1000;
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    // Only show seconds in the last minute
    return `${minutes}m`;
  } else {
    return `${seconds}s`;
  }
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function isCurrentPrayerTime(prayerTime: PrayerTime): boolean {
  const now = new Date();
  const diff = Math.abs(prayerTime.time.getTime() - now.getTime());
  return diff <= ATHAN_DURATION;
}
