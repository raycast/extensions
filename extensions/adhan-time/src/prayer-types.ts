export interface Preferences {
  country: string;
  city: string;
  calculation_methods: string;
  hanfi: boolean;
  twelve_hours_system: boolean;
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
