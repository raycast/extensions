import { Cache, getPreferenceValues, Icon } from "@raycast/api";
import { Preferences } from "../types/preferences";
import { cityName, latitude, longitude, showForecast, showLocation, showSun, windSpeedUnits } from "./weather-utils";

export enum CacheKey {
  CURRENT_WEATHER = "Open-Meteo Weather",
  LOCATION = "Location",
  REFRESH_TIME = "Refresh Time",
  CITY_NAME = "City Name",
  LONGITUDE = "Longitude",
  LATITUDE = "Latitude",
  SHOW_SUN = "Show Sun",
  SHOW_LOCATION = "Show Location",
  SHOW_FORECAST = "Show Forecast",
}

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export function getUnits() {
  let tempUint: string;
  let windUint: string;
  const { tempUnits } = getPreferenceValues<Preferences>();
  if (tempUnits === "celsius") {
    tempUint = "℃";
  } else {
    tempUint = "℉";
  }
  switch (windSpeedUnits) {
    case "kmh": {
      windUint = "Km/h";
      break;
    }
    case "ms": {
      windUint = "m/s";
      break;
    }
    case "mph": {
      windUint = "Mph";
      break;
    }
    case "kn": {
      windUint = "Knots";
      break;
    }
    default: {
      windUint = "Km/h";
      break;
    }
  }

  return { tempUnit: tempUint, windUint: windUint };
}

export function isoToDateTime(time: string) {
  return time.replace("T", " ");
}

export function isoToTime(time: string) {
  return time.substring(11);
}

export function timeHour() {
  const date = new Date();
  return date.getHours();
}

export function shouldRefresh(oldRefreshTime: number, newRefreshTime: number) {
  const time = newRefreshTime - oldRefreshTime;
  return time >= 10 * 60 * 1000;
}

export function preferencesChanged() {
  const cache = new Cache();

  let oldCityName = "";
  let oldLon = "";
  let oldLat = "";

  let oldShowSun = true;
  let oldShowLocation = true;
  let oldShowForecast = true;

  const newLon = typeof longitude === "undefined" ? "" : longitude;
  const newLat = typeof latitude === "undefined" ? "" : latitude;
  const newCityName = typeof cityName === "undefined" ? "" : cityName;

  const cacheCityName = cache.get(CacheKey.CITY_NAME);
  const cacheLon = cache.get(CacheKey.LONGITUDE);
  const cacheLat = cache.get(CacheKey.LATITUDE);
  const cacheShowSun = cache.get(CacheKey.SHOW_SUN);
  const cacheShowLocation = cache.get(CacheKey.SHOW_LOCATION);
  const cacheShowForecast = cache.get(CacheKey.SHOW_FORECAST);
  if (typeof cacheCityName !== "undefined" && !isEmpty(cacheCityName)) {
    oldCityName = JSON.parse(cacheCityName) as string;
  }
  if (typeof cacheLon !== "undefined" && !isEmpty(cacheLon)) {
    oldLon = JSON.parse(cacheLon) as string;
  }
  if (typeof cacheLat !== "undefined" && !isEmpty(cacheLat)) {
    oldLat = JSON.parse(cacheLat) as string;
  }
  if (typeof cacheShowSun !== "undefined" && !isEmpty(cacheShowSun)) {
    oldShowSun = JSON.parse(cacheShowSun) as boolean;
  }
  if (typeof cacheShowLocation !== "undefined" && !isEmpty(cacheShowLocation)) {
    oldShowLocation = JSON.parse(cacheShowLocation) as boolean;
  }
  if (typeof cacheShowForecast !== "undefined" && !isEmpty(cacheShowForecast)) {
    oldShowForecast = JSON.parse(cacheShowForecast) as boolean;
  }

  cache.set(CacheKey.CITY_NAME, JSON.stringify(newCityName));
  cache.set(CacheKey.LONGITUDE, JSON.stringify(newLon));
  cache.set(CacheKey.LATITUDE, JSON.stringify(newLat));
  cache.set(CacheKey.SHOW_SUN, JSON.stringify(showSun));
  cache.set(CacheKey.SHOW_LOCATION, JSON.stringify(showLocation));
  cache.set(CacheKey.SHOW_FORECAST, JSON.stringify(showForecast));

  return (
    oldCityName !== newCityName ||
    oldLon !== newLon ||
    oldLat !== newLat ||
    oldShowSun !== showSun ||
    oldShowLocation !== showLocation ||
    oldShowForecast !== showForecast
  );
}

export function getDateIcon(day: string) {
  switch (day) {
    case "01":
      return Icon.Number01;
    case "02":
      return Icon.Number02;
    case "03":
      return Icon.Number03;
    case "04":
      return Icon.Number04;
    case "05":
      return Icon.Number05;
    case "06":
      return Icon.Number06;
    case "07":
      return Icon.Number07;
    case "08":
      return Icon.Number08;
    case "09":
      return Icon.Number09;
    case "10":
      return Icon.Number10;
    case "11":
      return Icon.Number11;
    case "12":
      return Icon.Number12;
    case "13":
      return Icon.Number13;
    case "14":
      return Icon.Number14;
    case "15":
      return Icon.Number15;
    case "16":
      return Icon.Number16;
    case "17":
      return Icon.Number17;
    case "18":
      return Icon.Number18;
    case "19":
      return Icon.Number19;
    case "20":
      return Icon.Number20;
    case "21":
      return Icon.Number21;
    case "22":
      return Icon.Number22;
    case "23":
      return Icon.Number23;
    case "24":
      return Icon.Number24;
    case "25":
      return Icon.Number25;
    case "26":
      return Icon.Number26;
    case "27":
      return Icon.Number27;
    case "28":
      return Icon.Number28;
    case "29":
      return Icon.Number29;
    case "30":
      return Icon.Number30;
    case "31":
      return Icon.Number31;
    default:
      return Icon.Number00;
  }
}
