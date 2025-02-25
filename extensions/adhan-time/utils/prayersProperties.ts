import { Icon } from "@raycast/api";
import { PrayerProperties, PrayerProperty } from "../src/prayer-types";

const prayersProperties: PrayerProperties = {
  Fajr: {
    sort: 0,
    name: 'Fajr',
    icon: Icon.Moon,
    nextPrayer: 'Sunrise',
    isPrayer: true,
    section: 'prayers',
  },
  Sunrise: {
    sort: 1,
    name: 'Sunrise',
    icon: Icon.Sunrise,
    nextPrayer: 'Dhuhr',
    isPrayer: false,
    section: 'times',
  },
  Dhuhr: {
    sort: 2,
    name: 'Dhuhr',
    icon: Icon.Sun,
    nextPrayer: "Asr",
    isPrayer: true,
    section: 'prayers',
  },
  Asr: {
    sort: 3,
    name: 'Asr',
    icon: Icon.Sun,
    nextPrayer: "Maghrib",
    isPrayer: true,
    section: 'prayers',
  },
  Sunset: {
    sort: 4,
    name: 'Sunset',
    icon: Icon.Sunrise,
    nextPrayer: 'Maghrib',
    isPrayer: false,
    section: 'times',
  },
  Maghrib: {
    sort: 5,
    name: 'Maghrib',
    icon: Icon.Moon,
    nextPrayer: "Isha",
    isPrayer: true,
    section: 'prayers',
  },
  Isha: {
    sort: 6,
    name: 'Isha',
    icon: Icon.Moon,
    nextPrayer: 'Midnight',
    isPrayer: true,
    section: 'prayers',
  },
  Midnight: {
    sort: 7,
    name: 'Midnight',
    icon: Icon.Clock,
    nextPrayer: 'Firstthird',
    isPrayer: false,
    section: 'times',
  },
  Firstthird: {
    sort: 8,
    name: 'First Third',
    icon: Icon.StackedBars1,
    nextPrayer: 'Lastthird',
    isPrayer: false,
    section: 'times',
  },
  Lastthird: {
    sort: 9,
    name: 'Last Third',
    icon: Icon.StackedBars3,
    nextPrayer: 'Imsak',
    isPrayer: false,
    section: 'times',
  },
  Imsak: {
    sort: 10,
    name: 'Imsak',
    icon: Icon.CircleDisabled,
    nextPrayer: 'Fajr',
    isPrayer: false,
    section: 'times',
  },
};

export function getPrayerProperties(prayerName: string) {
  return prayersProperties[prayerName as keyof typeof prayersProperties] as PrayerProperty;
}
