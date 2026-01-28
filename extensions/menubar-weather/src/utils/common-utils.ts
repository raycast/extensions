import { Cache, getPreferenceValues } from "@raycast/api";
import { Preferences } from "../types/preferences";
import { OpenMeteoWeather } from "../types/types";
import {
  cityName,
  iconStyle,
  latitude,
  longitude,
  menuHumidity,
  menuPressure,
  menuUVI,
  menuWind,
  precipitationUnits,
  showForecast,
  showLocation,
  showSun,
  showUVI,
  tempType,
  tempUnits,
  windAngle2Direction,
  windSpeedUnits,
} from "./weather-utils";

export enum CacheKey {
  LATEST_WEATHER = "Open-Meteo Weather",

  ICON_STYLE = "Icon Style",
  CITY_NAME = "City Name",
  LATITUDE = "Latitude",
  LONGITUDE = "Longitude",
  TEMP_UNIT = "Temperature unit",
  WIND_SPEED_UNIT = "Wind unit",
  PRECIPITATION_UNIT = "Precipitation Unit",
  TEMP_TYPE = "Temperature to display",
  MENU_UVI = "Show UV index in menu",
  MENU_PRESSURE = "Show pressure in menu",
  MENU_HUMIDITY = "Show humidity in menu",
  MENU_WIND = "Show wind in menu",
  SHOW_SUN = "Show Sun",
  SHOW_LOCATION = "Show Location",
  SHOW_FORECAST = "Show Forecast",
  SHOW_UVI = "Show UV Index",
}

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export function getUnits() {
  let tempUint: string;
  let windUnit: string;
  const { tempUnits } = getPreferenceValues<Preferences>();
  if (tempUnits === "celsius") {
    tempUint = "℃";
  } else {
    tempUint = "℉";
  }
  switch (windSpeedUnits) {
    case "kmh": {
      windUnit = "Km/h";
      break;
    }
    case "ms": {
      windUnit = "m/s";
      break;
    }
    case "mph": {
      windUnit = "Mph";
      break;
    }
    case "kn": {
      windUnit = "Knots";
      break;
    }
    default: {
      windUnit = "Km/h";
      break;
    }
  }

  return { tempUnit: tempUint, windUnit: windUnit };
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

const cache = new Cache();

export function preferencesChanged() {
  const oldIconStyle = getCacheString(CacheKey.ICON_STYLE);
  const oldCityName = getCacheString(CacheKey.CITY_NAME);
  const oldLat = getCacheString(CacheKey.LATITUDE);
  const oldLon = getCacheString(CacheKey.LONGITUDE);
  const oldTempUnits = getCacheString(CacheKey.TEMP_UNIT);
  const oldWindSpeedUnits = getCacheString(CacheKey.WIND_SPEED_UNIT);
  const oldPrecipitationUnits = getCacheString(CacheKey.PRECIPITATION_UNIT);
  const oldTempType = getCacheString(CacheKey.TEMP_TYPE);
  const oldMenuUVI = getCacheBoolean(CacheKey.MENU_UVI, false);
  const oldMenuPressure = getCacheBoolean(CacheKey.MENU_PRESSURE, false);
  const oldMenuHumidity = getCacheBoolean(CacheKey.MENU_HUMIDITY, false);
  const oldMenuWind = getCacheBoolean(CacheKey.MENU_WIND, false);
  const oldShowSun = getCacheBoolean(CacheKey.SHOW_SUN, true);
  const oldShowUVI = getCacheBoolean(CacheKey.SHOW_UVI, true);
  const oldShowLocation = getCacheBoolean(CacheKey.SHOW_LOCATION, true);
  const oldShowForecast = getCacheBoolean(CacheKey.SHOW_FORECAST, true);

  const newCityName = typeof cityName === "undefined" ? "" : cityName;
  const newLat = typeof latitude === "undefined" ? "" : latitude;
  const newLon = typeof longitude === "undefined" ? "" : longitude;

  cache.set(CacheKey.ICON_STYLE, JSON.stringify(iconStyle));
  cache.set(CacheKey.CITY_NAME, JSON.stringify(newCityName));
  cache.set(CacheKey.CITY_NAME, JSON.stringify(newCityName));
  cache.set(CacheKey.LATITUDE, JSON.stringify(newLat));
  cache.set(CacheKey.LONGITUDE, JSON.stringify(newLon));
  cache.set(CacheKey.TEMP_UNIT, JSON.stringify(tempUnits));
  cache.set(CacheKey.WIND_SPEED_UNIT, JSON.stringify(windSpeedUnits));
  cache.set(CacheKey.PRECIPITATION_UNIT, JSON.stringify(precipitationUnits));
  cache.set(CacheKey.TEMP_TYPE, JSON.stringify(tempType));
  cache.set(CacheKey.MENU_UVI, JSON.stringify(menuUVI));
  cache.set(CacheKey.MENU_PRESSURE, JSON.stringify(menuPressure));
  cache.set(CacheKey.MENU_HUMIDITY, JSON.stringify(menuHumidity));
  cache.set(CacheKey.MENU_WIND, JSON.stringify(menuWind));
  cache.set(CacheKey.SHOW_SUN, JSON.stringify(showSun));
  cache.set(CacheKey.SHOW_LOCATION, JSON.stringify(showLocation));
  cache.set(CacheKey.SHOW_FORECAST, JSON.stringify(showForecast));
  cache.set(CacheKey.SHOW_UVI, JSON.stringify(showUVI));

  return (
    oldIconStyle !== iconStyle ||
    oldCityName !== newCityName ||
    oldLat !== newLat ||
    oldLon !== newLon ||
    oldTempUnits !== tempUnits ||
    oldWindSpeedUnits !== windSpeedUnits ||
    oldPrecipitationUnits !== precipitationUnits ||
    oldTempType !== tempType ||
    oldMenuUVI !== menuUVI ||
    oldMenuPressure !== menuPressure ||
    oldMenuHumidity !== menuHumidity ||
    oldMenuWind !== menuWind ||
    oldShowUVI !== showUVI ||
    oldShowSun !== showSun ||
    oldShowLocation !== showLocation ||
    oldShowForecast !== showForecast
  );
}

function getCacheString(key: string, defaultValue = "") {
  try {
    const cacheString = cache.get(key);
    if (typeof cacheString == "string") {
      return JSON.parse(cacheString) as string;
    } else {
      return defaultValue;
    }
  } catch (e) {
    return defaultValue;
  }
}

function getCacheBoolean(key: string, defaultValue = false) {
  const cacheBoolean = cache.get(key);
  if (typeof cacheBoolean == "string") {
    return JSON.parse(cacheBoolean) as boolean;
  } else {
    return defaultValue;
  }
}

export function getDateIcon(day: string) {
  return `number-${day}-16`;
}

export function getMenuItem(weather: OpenMeteoWeather | undefined): string[] {
  const menuItems: string[] = [];

  const { tempUnit, windUnit } = getUnits();

  if (typeof weather !== "undefined") {
    menuItems.push(
      Math.round(
        tempType == "apparent_temperature"
          ? weather?.hourly.apparent_temperature[timeHour()]
          : weather?.current_weather?.temperature,
      ) + tempUnit,
    );
    if (menuUVI && weather.daily?.uv_index_max.length != 0) {
      menuItems.push("☀ " + Math.round(weather.daily.uv_index_max[0]));
    }
    if (menuPressure && weather.hourly?.surface_pressure.length != 0) {
      menuItems.push("㍱ " + Math.round(weather.hourly.surface_pressure[timeHour()]));
    }
    if (menuHumidity && weather.hourly?.relativehumidity_2m.length != 0) {
      menuItems.push(
        "🜄 " + Math.round(weather.hourly.relativehumidity_2m[timeHour()]) + weather.hourly_units.relativehumidity_2m,
      );
    }
    if (menuWind) {
      menuItems.push(
        windAngle2Direction(weather.current_weather.winddirection).icon +
          " " +
          Math.round(weather.current_weather.windspeed) +
          windUnit,
      );
    }
  }
  return menuItems;
}
