import { Prayers, PrayerPeriod } from "../src/prayer-types";
import { getPrayerProperties } from "./prayersProperties";
import { getCompareTime, timeToMinutes, currentTime24Hours } from "./timeUtils";

type PrayerWindow = {
  current: {
    name: string;
    time: string;
  };
  next: {
    name: string;
    time: string;
  };
};

function findCurrentPrayer(currentTime: string, prayers: Prayers): PrayerWindow | null {
  const currentMinutes = timeToMinutes(currentTime);

  // loop through prayers object and get current and next prayer
  for (const [key, value] of Object.entries(prayers)) {
    const currentPrayerTime = value;
    const currentPrayer = getPrayerProperties(key);
    const nextPrayerKey = currentPrayer.nextPrayer;
    const nextPrayerTime = prayers[nextPrayerKey as keyof Prayers];

    const currentPrayerMinutes = timeToMinutes(currentPrayerTime);
    let nextPrayerMinutes = timeToMinutes(nextPrayerTime);

    // Handle midnight wrap for next day
    if (nextPrayerMinutes < currentPrayerMinutes) {
      nextPrayerMinutes += 1440; // Add 24 hours in minutes
    }

    // Check if current time is in this prayer's window
    if (currentMinutes >= currentPrayerMinutes && currentMinutes < nextPrayerMinutes) {
      return {
        current: {
          name: key,
          time: currentPrayerTime
        },
        next: {
          name: nextPrayerKey,
          time: nextPrayerTime
        }
      };
    }
  }
  return null;
}

export function getCurrentPrayer(prayers: Prayers): PrayerPeriod {
  // Get current time
  const currentTime = currentTime24Hours();

  // Find current and next prayers
  const result = findCurrentPrayer(currentTime, prayers);

  let current: { name: string; time: string };
  let next: { name: string; time: string };

  if (result) {
    current = result.current;
    next = result.next;
  } else {
    // Fallback to last prayer of previous day
    const lastKey = Object.keys(prayers)[Object.keys(prayers).length - 1] as keyof Prayers;
    const firstKey = Object.keys(prayers)[0] as keyof Prayers;

    current = {
      name: lastKey,
      time: prayers[lastKey]
    };
    next = {
      name: firstKey,
      time: prayers[firstKey]
    };
  }

  return {
    current: current.name,
    next: next.name,
    currentTime: current.time,
    nextTime: next.time,
    compareTime: getCompareTime(next.time, currentTime)
  };
}
