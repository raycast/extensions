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
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function isCurrentPrayerTime(prayerTime: PrayerTime): boolean {
  const now = new Date();
  const diff = Math.abs(prayerTime.time.getTime() - now.getTime());
  return diff <= ATHAN_DURATION;
}
