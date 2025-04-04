import { Icon } from "@raycast/api";

export interface Prayer {
  name: keyof PrayerTimes;
  title: string;
  time: Date;
  type: "prayer" | "timing";
  icon: Icon;
  nextPrayer: keyof PrayerTimes | null;
  cutOffFor: keyof PrayerTimes | null;
}

export interface PrayerPeriod {
  current: Prayer;
  next: Prayer;
  sortedTimings: Prayer[];
  countdown: string;
}

export interface PrayerTimes {
  Fajr: Date;
  Sunrise: Date;
  Dhuhr: Date;
  Asr: Date;
  Sunset: Date;
  Maghrib: Date;
  Isha: Date;
  Imsak: Date;
  Midnight: Date;
  Firstthird: Date;
  Lastthird: Date;
  HijriDate: string;
}

export interface DailyPrayers {
  today: PrayerTimes;
  tomorrow: PrayerTimes;
}

export interface HijriDate {
  date: string;
  format: string;
  day: string;
  weekday: { en: string; ar: string };
  month: { number: number; en: string; ar: string; days: number };
  year: string;
  designation: { abbreviated: string; expanded: string };
  holidays: string[];
  adjustedHolidays: string[];
  method: string;
}

export interface PrayerType {
  code: number;
  status: string;
  data: {
    timings: {
      [key: string]: string;
    };
    date: {
      readable: string;
      timestamp: string;
      hijri: HijriDate;
    };
  };
}

export interface Prayers {
  [key: string]: string;
}

export interface Preferences {
  city: string;
  country: string;
  calculation_methods: string;
  hanfi: boolean;
  twelve_hours_system: boolean;
}
