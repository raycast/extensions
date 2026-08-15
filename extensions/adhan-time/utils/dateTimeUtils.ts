import { Prayer, HijriDate } from "../src/types/prayerTypes";
import { sortByTime } from "./sortPrayers";

export function formatHijriDate(hijriDate: HijriDate): string {
  return `${hijriDate.day} ${hijriDate.month.en} ${hijriDate.year}`;
}

export function createDateTime(timeStr: string, baseDate: Date): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const dateTime = new Date(baseDate);

  dateTime.setHours(hours, minutes, 0, 0);
  return dateTime;
}

export function currentTime24Hours(): string {
  const now = new Date();
  return now.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatPrayerTime(date: Date, use12Hour: boolean): string {
  if(date === null) {
    return "";
  }
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  let timeString = date.toLocaleTimeString('en-US', {
    hour12: use12Hour,
    hour: use12Hour ? 'numeric' : '2-digit',
    minute: '2-digit',
    timeZone: timeZone
  }).replace(/\s+/g, ' ').trim();

  const now = new Date();

  const dateDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffTime = dateDateOnly.getTime() - nowDateOnly.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    timeString = timeString + " (tmrw)";
  } else if (diffDays === -1) {
    timeString = timeString + " (yday)";
  }

  return timeString;
}

export function calculateCountdown(targetTime: Date): string {
  const now = new Date();
  const diff = targetTime.getTime() - now.getTime();

  if (diff < 0) return '(00:00)';

  const remainingHours = Math.floor(diff / (1000 * 60 * 60));
  const remainingMinutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const remainingSeconds = Math.floor((diff % (1000 * 60)) / 1000);

  return remainingHours > 0
    ? `${remainingHours}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
    : `${remainingMinutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function calculateMinutesUntil(targetTime: Date): number {
  return Math.floor((targetTime.getTime() - new Date().getTime()) / (1000 * 60));
}

export function formatDateForApi(date: Date): string {
  return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
}

export function getFormattedDates() {
  const yesterday = new Date();
  const today = new Date();
  const tomorrow = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return {
    yesterday,
    today,
    tomorrow,
    yesterdayFormatted: formatDateForApi(yesterday),
    todayFormatted: formatDateForApi(today),
    tomorrowFormatted: formatDateForApi(tomorrow)
  };
}

export function findCurrentAndNextPrayer(timings: Prayer[]): { currentPrayer: Prayer | null; nextPrayer: Prayer | null } {
  const now = new Date();
  const prayersAndCutoffs = timings
    .filter((p) => p.cutOffFor !== null || p.type === "prayer")

  const sortedPrayersAndCutoffs = sortByTime(prayersAndCutoffs);

  let currentPrayerIndex = sortedPrayersAndCutoffs.findIndex((p) => p.time > now && p.type === "prayer");
  let currentPrayer = sortedPrayersAndCutoffs[currentPrayerIndex] || sortedPrayersAndCutoffs[0];

  for(let i = 0; i < sortedPrayersAndCutoffs.length - 1; i++) {
    if(sortedPrayersAndCutoffs[i].time <= now && sortedPrayersAndCutoffs[i+1].time > now) {
      currentPrayerIndex = i;
      currentPrayer = sortedPrayersAndCutoffs[i];
      break;
    }
  }

  const upcomingTimings = sortedPrayersAndCutoffs.slice(currentPrayerIndex + 1);

  const nextPrayer = upcomingTimings.length > 0
    ? (upcomingTimings.find((p) => p.cutOffFor === currentPrayer.name) || upcomingTimings[0])
    : null;

  return { currentPrayer, nextPrayer };
}