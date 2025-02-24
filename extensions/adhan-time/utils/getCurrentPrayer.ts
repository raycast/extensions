import { Prayers, PrayerPeriod, PrayerProperty } from "../src/prayer-types";
import { getPrayerProperties } from "./prayersProperties";

type OrderedPrayer = {
  name: string;
  time: string;
  compareTime: string;
  properties: PrayerProperty;
};

function adjustMidnightTime(time: string, currentTime: string): string {
  const [currentHours] = currentTime.split(':');
  const [midnightHours] = time.split(':');
  const currentHour = parseInt(currentHours);
  const midnightHour = parseInt(midnightHours);

  // Only adjust to 24+ format if we're before midnight (current hour >= 12)
  return midnightHour < 12 && currentHour >= 12
    ? `24:${time.split(':')[1]}`
    : time;
}

function getCompareTime(prayerName: string, time: string, currentTime: string): string {
  return prayerName === 'Midnight'
    ? adjustMidnightTime(time, currentTime)
    : time;
}

function sortPrayers([keyA]: [string, string], [keyB]: [string, string]): number {
  const propA = getPrayerProperties(keyA);
  const propB = getPrayerProperties(keyB);
  return propA.sort - propB.sort;
}

function findNextPrayer(currentTime: string, prayer: OrderedPrayer, prayersList: OrderedPrayer[]): [OrderedPrayer, OrderedPrayer] | null {
  if (currentTime < prayer.compareTime) return null;

  const nextPrayerName = prayer.properties.nextPrayer || 'Fajr';
  const possibleNext = prayersList.find(p => p.name === nextPrayerName);

  if (!possibleNext || currentTime >= possibleNext.compareTime) return null;

  return [prayer, possibleNext];
}

export function getCurrentPrayer(prayers: Prayers): PrayerPeriod {
  // Get current time
  const now = new Date();
  const currentTime = now.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });

  // Convert prayers to array with their properties and adjust times for comparison
  const prayersList = Object.entries(prayers)
    .sort(sortPrayers)
    .map(([key, time]) => ({
      name: key,
      time: time,
      compareTime: getCompareTime(key, time, currentTime),
      properties: getPrayerProperties(key)
    }));

  // Find current and next prayers
  let current: OrderedPrayer | undefined;
  let next: OrderedPrayer | undefined;

  // Try to find the current prayer period
  for (const prayer of prayersList) {
    const result = findNextPrayer(currentTime, prayer, prayersList);
    if (result) {
      [current, next] = result;
      break;
    }
  }

  // Handle edge cases
  if (!current) {
    current = prayersList[prayersList.length - 1]; // Last prayer of previous day
    next = prayersList.find(p => p.name === 'Fajr')!;
  }

  if (!next) {
    next = prayersList.find(p => p.name === 'Fajr')!;
  }

  return {
    current: current.properties.name,
    next: next.name,
    currentTime: current.time,
    nextTime: next.time,
    compareTime: next.compareTime
  };
}
