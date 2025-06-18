import { AthanTimings } from "../types/types";

export interface NextPrayerInfo {
  name: string;
  time: string;
  minutesUntil: number;
  isWithinHour: boolean;
}

export function getNextPrayer(athanTimes: AthanTimings): NextPrayerInfo {
  const nowTime = new Date();
  const currentHour = nowTime.getHours();
  const currentMinute = nowTime.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;

  const prayers = [
    { name: "Fajr", time: athanTimes.Fajr },
    { name: "Dhuhr", time: athanTimes.Dhuhr },
    { name: "Asr", time: athanTimes.Asr },
    { name: "Maghrib", time: athanTimes.Maghrib },
    { name: "Isha", time: athanTimes.Isha },
  ];

  const prayerTimesInMinutes = prayers.map((prayer) => {
    const [hours, minutes] = prayer.time.split(":").map(Number);
    return {
      ...prayer,
      timeInMinutes: hours * 60 + minutes,
    };
  });

  for (const prayer of prayerTimesInMinutes) {
    if (prayer.timeInMinutes > currentTimeInMinutes) {
      const minutesUntil = prayer.timeInMinutes - currentTimeInMinutes;
      return {
        name: prayer.name,
        time: prayer.time,
        minutesUntil,
        isWithinHour: minutesUntil <= 60,
      };
    }
  }

  const fajrTomorrow = prayerTimesInMinutes[0];
  const minutesUntilTomorrow =
    24 * 60 - currentTimeInMinutes + fajrTomorrow.timeInMinutes;

  return {
    name: fajrTomorrow.name,
    time: fajrTomorrow.time,
    minutesUntil: minutesUntilTomorrow,
    isWithinHour: minutesUntilTomorrow <= 60,
  };
}

// Created by AI
export function formatTimeRemaining(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);
  const seconds = Math.floor((totalMinutes % 1) * 60);

  if (hours > 0) {
    // Show hours and minutes for longer durations
    return `${hours}:${minutes.toString().padStart(2, "0")}h`;
  } else {
    // Show minutes and seconds for under 1 hour
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }
}

export function calculateRemainingTime(nextPrayer: NextPrayerInfo): number {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentSecond = now.getSeconds();

  // Convert current time to total minutes (with seconds as decimal)
  const currentTimeInMinutes =
    currentHour * 60 + currentMinute + currentSecond / 60;

  const [hours, minutes] = nextPrayer.time.split(":").map(Number);
  const prayerTimeInMinutes = hours * 60 + minutes;

  let remainingMinutes = prayerTimeInMinutes - currentTimeInMinutes;

  // Handle next day case (if remaining is negative, it's tomorrow)
  if (remainingMinutes <= 0) {
    remainingMinutes += 24 * 60;
  }

  return remainingMinutes;
}
