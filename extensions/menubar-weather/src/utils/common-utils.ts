import { Cache, getPreferenceValues, Icon } from "@raycast/api";
import { Preferences } from "../types/preferences";
import { GeoLocation, Weather } from "../types/types";
import { cityName, latitude, longitude } from "./open-weather-utils";

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
  let windUint: string;
  const { unit } = getPreferenceValues<Preferences>();
  if (unit === "Metric") {
    tempUint = "℃";
    windUint = "m/s";
  } else {
    tempUint = "℉";
    windUint = "m/h";
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
  return `http://openweathermap.org/img/wn/${icon}@2x.png`;
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

  const cacheCityName = cache.get(CacheKey.CITY_NAME);
  const cacheLon = cache.get(CacheKey.LONGITUDE);
  const cacheLat = cache.get(CacheKey.LATITUDE);
  if (typeof cacheCityName === "string" && !isEmpty(cacheCityName)) {
    oldCityName = JSON.parse(cacheCityName) as string;
  }
  if (typeof cacheLon === "string" && !isEmpty(cacheLon)) {
    oldLon = JSON.parse(cacheLon) as string;
  }
  if (typeof cacheLat === "string" && !isEmpty(cacheLat)) {
    oldLat = JSON.parse(cacheLat) as string;
  }
  cache.set(CacheKey.CITY_NAME, JSON.stringify(cityName));
  cache.set(CacheKey.LONGITUDE, JSON.stringify(longitude));
  cache.set(CacheKey.LATITUDE, JSON.stringify(latitude));

  return oldCityName !== cityName || oldLon !== longitude || oldLat !== latitude;
}
