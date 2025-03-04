import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../types/preferences";
import { Daily, KLocation } from "../types/types";
import { weatherDescriptions } from "./icon-utils";
import { getLocationFromAddress } from "swift:../../swift/Location";

// preferences
export const {
  iconStyle,
  cityName,
  tempUnits,
  windSpeedUnits,
  precipitationUnits,
  latitude,
  longitude,
  tempType,
  menuUVI,
  menuPressure,
  menuHumidity,
  menuWind,
  showSun,
  showUVI,
  showLocation,
  showForecast,
} = getPreferenceValues<Preferences>();

export async function getGeoLocation(): Promise<KLocation> {
  try {
    if (latitude && longitude && !isNaN(parseFloat(latitude)) && !isNaN(parseFloat(longitude))) {
      return { latitude: parseFloat(latitude.trim()), longitude: parseFloat(longitude.trim()) };
    }
    return await getLocationFromAddress(cityName);
  } catch (e) {
    console.error(e);
  }
  return {
    latitude: 40.71427,
    longitude: -74.00597,
  };
}

/*
0	Clear sky
1, 2, 3	Mainly clear, partly cloudy, and overcast
45, 48	Fog and depositing rime fog
51, 53, 55	Drizzle: Light, moderate, and dense intensity
56, 57	Freezing Drizzle: Light and dense intensity
61, 63, 65	Rain: Slight, moderate and heavy intensity
66, 67	Freezing Rain: Light and heavy intensity
71, 73, 75	Snow fall: Slight, moderate, and heavy intensity
77	Snow grains
80, 81, 82	Rain showers: Slight, moderate, and violent
85, 86	Snow showers slight and heavy
95  Thunderstorm: Slight or moderate
96, 99 	Thunderstorm with slight and heavy hail
 */
export function getWeatherDescription(weatherCode: number | undefined) {
  if (typeof weatherCode === "undefined") {
    return "No weather info";
  }
  return weatherDescriptions.get(weatherCode) + "";
}

export const windAngle2Direction = (windAngle: number) => {
  if ((windAngle >= 0 && windAngle < 11.25) || (windAngle >= 348.75 && windAngle <= 360)) {
    return { icon: "↓", symbol: "N", direction: "North" };
  }

  if (windAngle >= 11.25 && windAngle < 33.75) {
    return { icon: "↙", symbol: "NNE", direction: "North-Northeast" };
  }
  if (windAngle >= 33.75 && windAngle < 56.75) {
    return { icon: "↙", symbol: "NE", direction: "Northeast" };
  }
  if (windAngle >= 56.75 && windAngle < 78.75) {
    return { icon: "↙", symbol: "ENE", direction: "East-Northeast" };
  }

  if (windAngle >= 78.75 && windAngle < 101.25) {
    return { icon: "←", symbol: "E", direction: "East" };
  }

  if (windAngle >= 101.25 && windAngle < 123.75) {
    return { icon: "↖", symbol: "ESE", direction: "East-Southeast" };
  }
  if (windAngle >= 123.75 && windAngle < 146.25) {
    return { icon: "↖", symbol: "SE", direction: "Southeast" };
  }
  if (windAngle >= 146.25 && windAngle < 168.75) {
    return { icon: "↖", symbol: "SSE", direction: "South-Southeast" };
  }

  if (windAngle >= 168.75 && windAngle < 191.25) {
    return { icon: "↑", symbol: "S", direction: "South" };
  }

  if (windAngle >= 191.25 && windAngle < 213.75) {
    return { icon: "↗", symbol: "SSW", direction: "South-Southwest" };
  }
  if (windAngle >= 213.75 && windAngle < 236.25) {
    return { icon: "↗", symbol: "SW", direction: "Southwest" };
  }
  if (windAngle >= 236.25 && windAngle < 258.75) {
    return { icon: "↗", symbol: "WSW", direction: "West-Southwest" };
  }

  if (windAngle >= 258.75 && windAngle < 281.25) {
    return { icon: "→", symbol: "W", direction: "West" };
  }

  if (windAngle >= 281.25 && windAngle < 303.75) {
    return { icon: "↘", symbol: "WNW", direction: "West-Northwest" };
  }
  if (windAngle >= 303.75 && windAngle < 326.25) {
    return { icon: "↘", symbol: "NW", direction: "Northwest" };
  }
  if (windAngle >= 326.25 && windAngle < 348.75) {
    return { icon: "↘", symbol: "NNW", direction: "North-Northwest" };
  }
  return { icon: "⏺", symbol: "C", direction: "" };
};

export const windDirection = (windAngle: number) => {
  const windDirectionInfo = windAngle2Direction(windAngle);
  return `${windDirectionInfo.icon} ${windDirectionInfo.direction}(${windDirectionInfo.symbol})`;
};

export const windDirectionSimple = (daily: Daily, index: number) => {
  if (typeof daily.winddirection_10m_dominant !== "undefined" && daily.winddirection_10m_dominant !== null) {
    const windDirectionInfo = windAngle2Direction(daily.winddirection_10m_dominant[index]);
    return `    ${windDirectionInfo.icon} (${windDirectionInfo.symbol})`;
  }
  return "";
};
