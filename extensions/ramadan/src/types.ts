// Type definitions for the Ramadan extension

export interface Preferences {
  city: string;
  country: string;
  method: string;
  hijriDateOffset: string;
  timeFormat: string;
}

export interface PrayerTimings {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Sunset: string;
  Isha: string;
  Imsak: string;
  Midnight: string;
  [key: string]: string;
}

export interface HijriDate {
  date: string;
  day: string;
  month: {
    number: number;
    en: string;
    ar: string;
  };
  year: string;
  weekday: {
    en: string;
    ar: string;
  };
  designation: {
    abbreviated: string;
    expanded: string;
  };
  holidays: string[];
}

export interface GregorianDate {
  date: string;
  day: string;
  month: {
    number: number;
    en: string;
  };
  year: string;
  weekday: {
    en: string;
  };
  designation: {
    abbreviated: string;
    expanded: string;
  };
}

export interface AladhanTimingsResponse {
  code: number;
  status: string;
  data: {
    timings: PrayerTimings;
    date: {
      readable: string;
      timestamp: string;
      hijri: HijriDate;
      gregorian: GregorianDate;
    };
    meta: {
      latitude: number;
      longitude: number;
      timezone: string;
      method: {
        id: number;
        name: string;
      };
    };
  };
}

export interface AladhanCalendarResponse {
  code: number;
  status: string;
  data: Array<{
    timings: PrayerTimings;
    date: {
      readable: string;
      timestamp: string;
      hijri: HijriDate;
      gregorian: GregorianDate;
    };
    meta: {
      latitude: number;
      longitude: number;
      timezone: string;
      method: {
        id: number;
        name: string;
      };
    };
  }>;
}

export interface RamadanDay {
  dayNumber: number;
  gregorianDate: string;
  hijriDate: string;
  suhoor: string;
  iftar: string;
  isToday: boolean;
  isPast: boolean;
}

export interface RamadanInfo {
  isRamadan: boolean;
  currentDay: number | null;
  totalDays: number;
  daysUntilRamadan: number | null;
  ramadanStartDate: string | null;
  ramadanEndDate: string | null;
}
