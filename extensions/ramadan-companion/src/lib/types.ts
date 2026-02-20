// Shared TypeScript interfaces for the AlAdhan API response

export interface AlAdhanTimings {
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
}

export interface AlAdhanHijriDate {
  date: string;
  format: string;
  day: string;
  weekday: { en: string; ar: string };
  month: { number: number; en: string; ar: string };
  year: string;
  designation: { abbreviated: string; expanded: string };
  holidays: string[];
}

export interface AlAdhanGregorianDate {
  date: string;
  format: string;
  day: string;
  weekday: { en: string };
  month: { number: number; en: string };
  year: string;
  designation: { abbreviated: string; expanded: string };
}

export interface AlAdhanDate {
  readable: string;
  timestamp: string;
  hijri: AlAdhanHijriDate;
  gregorian: AlAdhanGregorianDate;
}

export interface AlAdhanMeta {
  latitude: number;
  longitude: number;
  timezone: string;
  method: {
    id: number;
    name: string;
    params: Record<string, number>;
    location: { latitude: number; longitude: number };
  };
  latitudeAdjustmentMethod: string;
  midnightMode: string;
  school: string;
  offset: Record<string, number>;
}

export interface AlAdhanData {
  timings: AlAdhanTimings;
  date: AlAdhanDate;
  meta: AlAdhanMeta;
}

export interface AlAdhanResponse {
  code: number;
  status: string;
  data: AlAdhanData;
}

export interface PrayerTimes {
  sehri: string; // Fajr or Imsak depending on preference
  iftar: string; // Maghrib
  fajr: string;
  imsak: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  isha: string;
  date: AlAdhanDate;
  meta: AlAdhanMeta;
}
