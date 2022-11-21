import { getPreferenceValues, Icon } from "@raycast/api";
import { Preferences } from "../types/preferences";

export enum CacheKey {
  CURRENT_WEATHER = "Current Weather",
  LOCATION = "Location",
}

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
    return Icon.Bird;
  }
  return `http://openweathermap.org/img/wn/${icon}@2x.png`;
}
