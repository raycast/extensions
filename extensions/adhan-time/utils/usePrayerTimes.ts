import { useState, useEffect } from "react";
import { getPreferenceValues } from "@raycast/api";
import type { Prayers, Preferences } from "../src/prayer-types";
import { fetchPrayers } from "./fetchPrayers";
import { getCurrentPrayer } from "./getCurrentPrayer";
import { getPrayerProperties } from "./prayersProperties";

export function calculateCountdown(compareTime: string): string {
  const [hours, minutes] = compareTime.split(':');
  const nextPrayer = new Date();
  const now = new Date();

  // Handle 24h format (Midnight special case)
  if (compareTime.startsWith('24:') && now.getHours() < 12) {
    nextPrayer.setHours(0, parseInt(minutes), 0); // Use 00 hours for calculation
  } else {
    nextPrayer.setHours(parseInt(hours), parseInt(minutes), 0);
  }

  const diff = nextPrayer.getTime() - now.getTime();
  // Handle negative durations (just in case)
  if (diff < 0) return '(00:00)';

  const remainingHours = Math.floor(diff / (1000 * 60 * 60));
  const remainingMinutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const remainingSeconds = Math.floor((diff % (1000 * 60)) / 1000);

  return remainingHours > 0
    ? `(${remainingHours}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')})`
    : `(${remainingMinutes}:${remainingSeconds.toString().padStart(2, '0')})`;
}

export function usePrayerTimes() {
  const userPreference: Preferences = getPreferenceValues();
  const { isLoading, data: prayerTimes } = fetchPrayers();
  const prayers: Prayers | undefined = prayerTimes?.data.timings;
  const currentPrayer = prayers ? getCurrentPrayer(prayers) : null;

  // Get prayer properties for current prayer
  const currentPrayerProperties = currentPrayer?.current ? getPrayerProperties(currentPrayer.current) : null;

  const [countdown, setCountdown] = useState(() =>
    currentPrayer?.compareTime && currentPrayerProperties?.isPrayer
      ? calculateCountdown(currentPrayer.compareTime)
      : ""
  );

  useEffect(() => {
    // Only start timer if it's an actual prayer
    if (!currentPrayerProperties?.isPrayer) {
      setCountdown(""); // Clear countdown if not a prayer
      return;
    }

    const timer = setInterval(() => {
      if (currentPrayer?.compareTime) {
        setCountdown(calculateCountdown(currentPrayer.compareTime));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [currentPrayer?.compareTime]);

  return {
    isLoading,
    prayers,
    currentPrayer,
    countdown,
    userPreference
  };
}
