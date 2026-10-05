import * as SunCalc from "suncalc";
import { DateTime } from "luxon";

export interface SunTimes {
  sunrise: string;
  sunset: string;
}

export function getSunTimes(lat: number, lng: number, date: Date, timezone: string, timeFormat: string): SunTimes {
  const times = SunCalc.getTimes(date, lat, lng);

  const sunrise = DateTime.fromJSDate(times.sunrise).setZone(timezone);
  const sunset = DateTime.fromJSDate(times.sunset).setZone(timezone);

  return {
    sunrise: sunrise.isValid ? sunrise.toFormat(timeFormat) : "—",
    sunset: sunset.isValid ? sunset.toFormat(timeFormat) : "—",
  };
}
