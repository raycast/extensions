import { Prayers, PrayerPeriod } from "../src/prayer-types";
import { getPrayerProperties } from "./prayersProperties";

export function convertHours(time: string) {
  const hours = time.split(':')[0];
  const minutes = time.split(':')[1];
  if (parseInt(hours) > 12)
    return `${parseInt(hours) - 12}:${minutes} pm`
  else
    return `${hours}:${minutes} am`
}

export function parseCountdown(countdown: string): number {
  let timeLeftInMinutes = 0;

  if (countdown) {
    // Handle both HH:MM:SS and MM:SS formats
    const timeMatch = countdown.match(/\((\d+):(\d+):(\d+)\)|\((\d+):(\d+)\)/);
    let hours = 0, minutes = 0;

    if (timeMatch) {
      if (timeMatch[1]) { // HH:MM:SS format
        hours = parseInt(timeMatch[1]);
        minutes = parseInt(timeMatch[2]);
      } else if (timeMatch[4]) { // MM:SS format
        minutes = parseInt(timeMatch[4]);
      }
    }

    timeLeftInMinutes = hours * 60 + minutes;
  }

  return timeLeftInMinutes;
}

export function sortPrayers(prayers: Prayers, currentPrayer: PrayerPeriod | null) {
  return Object.entries(prayers).sort((a, b) => {
    const aProperties = getPrayerProperties(a[0]);
    const bProperties = getPrayerProperties(b[0]);

    // If one is a prayer and the other isn't, prayers come first
    if (aProperties.isPrayer !== bProperties.isPrayer) {
      return aProperties.isPrayer ? -1 : 1;
    }

    // If neither are prayers, sort by their original sort property
    if (!aProperties.isPrayer && !bProperties.isPrayer) {
      return aProperties.sort - bProperties.sort;
    }

    // For actual prayers, use our chronological sorting
    const getCompareMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      const currentMinutes = currentPrayer?.currentTime.split(':').map(Number).reduce((h, m) => h * 60 + m, 0) || 0;
      const prayerMinutes = hours * 60 + minutes;

      return prayerMinutes < currentMinutes ?
        (hours + 24) * 60 + minutes :
        prayerMinutes;
    };

    const aIsCurrent = a[0] === currentPrayer?.current;
    const bIsCurrent = b[0] === currentPrayer?.current;

    // Current prayer always comes first
    if (aIsCurrent) return -1;
    if (bIsCurrent) return 1;

    const aMinutes = getCompareMinutes(a[1]);
    const bMinutes = getCompareMinutes(b[1]);

    return aMinutes - bMinutes;
  });
}
