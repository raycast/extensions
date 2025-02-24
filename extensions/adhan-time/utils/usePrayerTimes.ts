import { useState, useEffect } from "react";
import { getPreferenceValues } from "@raycast/api";
import type { Prayers, Preferences } from "../src/prayer-types";
import { fetchPrayers } from "./fetchPrayers";
import { getCurrentPrayer } from "./getCurrentPrayer";
import { getPrayerProperties } from "./prayersProperties";
import { calculateCountdown } from "./timeUtils";
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
