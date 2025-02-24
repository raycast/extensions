import { Icon } from "@raycast/api";

export interface Preferences {
  country: string;
  city: string;
  calculation_methods: string;
  hanfi: boolean;
  twelve_hours_system: boolean;
  menu_bar_icon_only: boolean;
}
export type Prayers = {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Sunset: string;
  Maghrib: string;
  Isha: string;
  Imsak: string;
  Midnight: string;
  Firstthird: string;
  Lastthird: string;
};
export type PrayerType = {
  data: {
    timings: Prayers;
  };
};

export type PrayerPeriod = {
  current: string;
  next: string;
  currentTime: string;
  nextTime: string;
  compareTime: string;
};

export type PrayerProperty = {
  sort: number;
  name: string;
  icon: Icon;
  nextPrayer: string | null;
  isPrayer: boolean;
  section: "prayers" | "times";
};

export type PrayerProperties = Record<keyof Prayers, PrayerProperty>;
