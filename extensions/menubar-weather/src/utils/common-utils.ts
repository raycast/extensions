import { Cache, getPreferenceValues, Icon } from "@raycast/api";
import { Preferences } from "../types/preferences";
import { cityName, latitude, longitude } from "./weather-utils";

export enum CacheKey {
  CURRENT_WEATHER = "Current Weather",
  LOCATION = "Location",
  REFRESH_TIME = "Refresh Time",
  CITY_NAME = "City Name",
  LONGITUDE = "Longitude",
  LATITUDE = "Latitude",
}

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export function getUnits() {
  let tempUint: string;
  const windUint = "Km/h";
  const { tempUnits } = getPreferenceValues<Preferences>();
  if (tempUnits === "celsius") {
    tempUint = "℃";
  } else {
    tempUint = "℉";
  }

  return { tempUnit: tempUint, windUint: windUint };
}

export function getWeatherIcon(icon: string | undefined) {
  if (typeof icon === "string") {
    if (icon === "01d" || icon === "01n") {
      return Icon.Sun;
    }
    if (icon === "02d" || icon === "02n") {
      return Icon.CloudSun;
    }
    if (icon === "03d" || icon === "03n") {
      return Icon.Cloud;
    }
    if (icon === "04d" || icon === "04n") {
      return Icon.Cloud;
    }
    if (icon === "09d" || icon === "09n") {
      return Icon.CloudRain;
    }
    if (icon === "10d" || icon === "10n") {
      return Icon.CloudRain;
    }
    if (icon === "11d" || icon === "11n") {
      return Icon.CloudLightning;
    }
    if (icon === "13d" || icon === "13n") {
      return Icon.Snowflake;
    }
    if (icon === "50d" || icon === "50n") {
      return Icon.Snippets;
    }
  } else {
    return Icon.Sunrise;
  }
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

export function getTime(stamp: number) {
  const timeStamp = stamp * 1000;
  const date = new Date(timeStamp);
  return date.toLocaleTimeString();
}

export function shouldRefresh(oldRefreshTime: number, newRefreshTime: number) {
  const time = newRefreshTime - oldRefreshTime;
  return time >= 5 * 60 * 1000;
}

export function preferencesChanged() {
  const cache = new Cache();

  let oldCityName = "";
  let oldLon = "";
  let oldLat = "";

  const newLon = typeof longitude === "undefined" ? "" : longitude;
  const newLat = typeof latitude === "undefined" ? "" : latitude;
  const newCityName = typeof cityName === "undefined" ? "" : cityName;

  const cacheCityName = cache.get(CacheKey.CITY_NAME);
  const cacheLon = cache.get(CacheKey.LONGITUDE);
  const cacheLat = cache.get(CacheKey.LATITUDE);
  if (typeof cacheCityName !== "undefined" && !isEmpty(cacheCityName)) {
    oldCityName = JSON.parse(cacheCityName) as string;
  }
  if (typeof cacheLon !== "undefined" && !isEmpty(cacheLon)) {
    oldLon = JSON.parse(cacheLon) as string;
  }
  if (typeof cacheLat !== "undefined" && !isEmpty(cacheLat)) {
    oldLat = JSON.parse(cacheLat) as string;
  }

  cache.set(CacheKey.CITY_NAME, JSON.stringify(newCityName));
  cache.set(CacheKey.LONGITUDE, JSON.stringify(newLon));
  cache.set(CacheKey.LATITUDE, JSON.stringify(newLat));

  return oldCityName !== newCityName || oldLon !== newLon || oldLat !== newLat;
}
