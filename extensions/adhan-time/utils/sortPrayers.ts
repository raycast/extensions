import { Prayer } from "../src/types/prayerTypes";

export function sortTimingsByTypeAndTime(prayers: Prayer[]): Prayer[] {
  return [...prayers].sort((a, b) => {
    // First, separate prayers from timings
    const aIsPrayer = a.type === "prayer";
    const bIsPrayer = b.type === "prayer";

    // If one is a prayer and the other isn't, prayers come first
    if (aIsPrayer !== bIsPrayer) {
      return aIsPrayer ? -1 : 1;
    }

    return a.time.getTime() - b.time.getTime();
  });
}

export function sortByTime(prayers: Prayer[]): Prayer[] {
  return prayers.sort((a, b) => a.time.getTime() - b.time.getTime());
}