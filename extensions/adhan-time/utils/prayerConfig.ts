import { Icon } from "@raycast/api";
import { PrayerTimes } from "../src/types/prayerTypes";

export const PRAYER_CONFIG = {
  Fajr: {
    title: "Fajr",
    type: "prayer" as const,
    icon: Icon.Moon,
    nextPrayer: "Sunrise" as keyof PrayerTimes,
    cutOffFor: null
  },
  Sunrise: {
    title: "Sunrise",
    type: "timing" as const,
    icon: Icon.Sunrise,
    nextPrayer: "Dhuhr" as keyof PrayerTimes,
    cutOffFor: "Fajr" as keyof PrayerTimes
  },
  Dhuhr: {
    title: "Dhuhr",
    type: "prayer" as const,
    icon: Icon.Sun,
    nextPrayer: "Asr" as keyof PrayerTimes,
    cutOffFor: null
  },
  Asr: {
    title: "Asr",
    type: "prayer" as const,
    icon: Icon.Sun,
    nextPrayer: "Maghrib" as keyof PrayerTimes,
    cutOffFor: "Dhuhr" as keyof PrayerTimes
  },
  Sunset: {
    title: "Sunset",
    type: "timing" as const,
    icon: Icon.Sunrise,
    nextPrayer: "Maghrib" as keyof PrayerTimes,
    cutOffFor: null
  },
  Maghrib: {
    title: "Maghrib",
    type: "prayer" as const,
    icon: Icon.Moon,
    nextPrayer: "Isha" as keyof PrayerTimes,
    cutOffFor: "Asr" as keyof PrayerTimes
  },
  Isha: {
    title: "Isha",
    type: "prayer" as const,
    icon: Icon.Moon,
    nextPrayer: "Midnight" as keyof PrayerTimes,
    cutOffFor: "Maghrib" as keyof PrayerTimes
  },
  Midnight: {
    title: "Midnight",
    type: "timing" as const,
    icon: Icon.Clock,
    nextPrayer: "Firstthird" as keyof PrayerTimes,
    cutOffFor: "Isha" as keyof PrayerTimes
  },
  Firstthird: {
    title: "First Third",
    type: "timing" as const,
    icon: Icon.StackedBars1,
    nextPrayer: "Lastthird" as keyof PrayerTimes,
    cutOffFor: null
  },
  Lastthird: {
    title: "Last Third",
    type: "timing" as const,
    icon: Icon.StackedBars3,
    nextPrayer: "Imsak" as keyof PrayerTimes,
    cutOffFor: null
  },
  Imsak: {
    title: "Imsak",
    type: "timing" as const,
    icon: Icon.CircleDisabled,
    nextPrayer: "Fajr" as keyof PrayerTimes,
    cutOffFor: null
  }
} as const;