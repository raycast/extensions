import { useState, useEffect } from "react";
import { fetchPrayers } from "./fetchPrayers";
import { PRAYER_CONFIG } from "./prayerConfig";
import { createDateTime,
         calculateCountdown,
         getFormattedDates,
         findCurrentAndNextPrayer,
         formatHijriDate } from "./dateTimeUtils";
import { Prayer, PrayerPeriod, PrayerTimes, PrayerType } from "../src/types/prayerTypes";
import { sortTimingsByTypeAndTime, sortByTime } from "./sortPrayers";

/**
 * Processes raw API data into structured prayer times
 * @param todayData - Today's prayer times data
 * @param tomorrowData - Tomorrow's prayer times data
 * @param yesterdayData - Yesterday's prayer times data
 * @returns Array of prayers
 * Note that we need yesterday's data to calc the countdown for Isha past 00:00 when Midnight timing is after 00:00
 * We need tomorrow's data to show upcoming prayers after Isha before 00:00
 */
function processPrayerTimes(yesterdayData: PrayerType, todayData: PrayerType, tomorrowData: PrayerType): Prayer[] {
  const { today, tomorrow, yesterday } = getFormattedDates();

  const processPrayersForDate = (data: PrayerType, date: Date): Prayer[] => {
    const prayers: Prayer[] = [];
    if (data?.data?.timings) {
      Object.entries(data.data.timings).forEach(([name, timeStr]) => {
        if (name in PRAYER_CONFIG) {
          const config = PRAYER_CONFIG[name as keyof typeof PRAYER_CONFIG];
          prayers.push({
            name: name as keyof PrayerTimes,
            title: config.title,
            time: createDateTime(timeStr, date),
            type: config.type,
            icon: config.icon,
            nextPrayer: config.nextPrayer,
            cutOffFor: config.cutOffFor
          });
        }
      });
    }
    return prayers;
  };

  return [
    ...processPrayersForDate(yesterdayData, yesterday),
    ...processPrayersForDate(todayData, today),
    ...processPrayersForDate(tomorrowData, tomorrow)
  ];
}

/**
 * Gets the relevant prayers from the current prayer until before the same prayer tomorrow
 */
function getUpcomingPrayers(prayers: Prayer[], currentPrayer: Prayer): Prayer[] {
  const sortedPrayers = sortByTime(prayers);
  const currentPrayerIndex = sortedPrayers.findIndex(p =>
    p.name === currentPrayer.name && p.time.getTime() === currentPrayer.time.getTime()
  );

  if (currentPrayerIndex === -1) return sortedPrayers;

  // Upcoming prayers
  const upcomingPrayersWithoutCurrent = sortedPrayers.slice(currentPrayerIndex + 1);
  const upcomingPrayersWithCurrent = [currentPrayer, ...upcomingPrayersWithoutCurrent];

  // Find the next occurrence of the same prayer
  const nextSamePrayerIndex = upcomingPrayersWithoutCurrent.findIndex((p) =>
    p.name === currentPrayer.name
  );

  if (nextSamePrayerIndex === -1) {
    // If not found, return from current to the end
    return upcomingPrayersWithCurrent;
  }

  // Return prayers from current until before the same prayer tomorrow
  return [currentPrayer, ...upcomingPrayersWithoutCurrent.slice(0, nextSamePrayerIndex)];
}

/**
 * Determines the current prayer period based on the current time
 */
function determineCurrentPrayerPeriod(prayers: Prayer[]): PrayerPeriod | null {
  const { currentPrayer, nextPrayer } = findCurrentAndNextPrayer(prayers);
  if (!currentPrayer || !nextPrayer) return null;

  // Sort prayers and get relevant ones
  const upcomingPrayers = getUpcomingPrayers(prayers, currentPrayer);
  const sortedTimings = sortTimingsByTypeAndTime(upcomingPrayers);

  return {
    current: currentPrayer,
    next: nextPrayer,
    sortedTimings,
    countdown: ""
  };
}

/**
 * Hook to fetch and process prayer times for yesterday, today and tomorrow
 * @returns Prayer times data and current prayer period information
 */
export function usePrayerTimes() {
  const { yesterdayFormatted, todayFormatted, tomorrowFormatted } = getFormattedDates();

  // Fetch prayer times for today and tomorrow
  const { data: todayData, isLoading: isTodayLoading } = fetchPrayers(todayFormatted);
  const { data: tomorrowData, isLoading: isTomorrowLoading } = fetchPrayers(tomorrowFormatted);
  const { data: yesterdayData, isLoading: isYesterdayLoading } = fetchPrayers(yesterdayFormatted);

  const anyLoading = isTodayLoading || isTomorrowLoading || isYesterdayLoading;
  const noData = !todayData || !tomorrowData || !yesterdayData;
  const [isLoading, setIsLoading] = useState(anyLoading);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState<PrayerPeriod | null>(null);
  const [countdown, setCountdown] = useState("");
  const [hijriDate, setHijriDate] = useState("");

  // Effect to process prayer times and determine current period
  useEffect(() => {
    if (anyLoading || noData) {
      setIsLoading(true);
      return;
    }

    setIsLoading(false);
    setIsRefreshing(false);

    // Process prayer times and determine current period
    const prayerTimes = processPrayerTimes(yesterdayData, todayData, tomorrowData);
    const formattedHijriDate = formatHijriDate(todayData.data.date.hijri);
    setHijriDate(formattedHijriDate);
    const period = determineCurrentPrayerPeriod(prayerTimes);
    setCurrentPeriod(period);
  }, [noData, anyLoading, isRefreshing]);

  // Effect to update countdown timer
  useEffect(() => {
    if (!currentPeriod?.next || currentPeriod.current.type !== "prayer") {
      setCountdown("");
      return;
    }

    const updateCountdown = () => {
      const newCountdown = calculateCountdown(currentPeriod.next.time);
      setCountdown(newCountdown);

      // Check if we've reached or passed the next prayer time
      const now = new Date();
      if (now >= currentPeriod.next.time) {
        setIsRefreshing(true);
      }
    };

    updateCountdown(); // Initial update
    const timer = setInterval(updateCountdown, 1000);

    return () => clearInterval(timer);
  }, [currentPeriod]);

  return {
    isLoading,
    currentPeriod,
    hijriDate,
    countdown
  };
}
