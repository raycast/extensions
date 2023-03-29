import { getPreferenceValues, Icon } from "@raycast/api";
import { Preferences } from "../types/preferences";
import { isEmpty } from "./common-utils";
import { getOpenMeteoLocation, getOpenMeteoWeather } from "./axios-utils";
import { Daily, GeoLocation } from "../types/types";

export const {
  cityName,
  tempUnits,
  windSpeedUnits,
  precipitationUnits,
  longitude,
  latitude,
  showSun,
  showLocation,
  showForecast,
} = getPreferenceValues<Preferences>();

export async function getGeoLocation() {
  const geoLocation = await getOpenMeteoLocation();
  if (
    typeof geoLocation !== "undefined" &&
    typeof geoLocation.results !== "undefined" &&
    geoLocation.results.length >= 1
  ) {
    return geoLocation.results[0] as GeoLocation;
  } else
    return {
      id: 5128581,
      name: "New York",
      latitude: 40.71427,
      longitude: -74.00597,
      elevation: 10.0,
      feature_code: "PPL",
      country_code: "US",
      admin1_id: 5128638,
      timezone: "America/New_York",
      population: 8175133,
      country_id: 6252001,
      country: "United States",
      admin1: "New York",
      admin2: "New York",
    };
}

export async function getCurWeather() {
  let weatherData;
  let geoLocation;
  if (!isEmptyLonLat()) {
    weatherData = await getOpenMeteoWeather(longitude, latitude);
    geoLocation = undefined;
  } else {
    geoLocation = await getGeoLocation();
    weatherData = await getOpenMeteoWeather(geoLocation.longitude.toString(), geoLocation.latitude.toString());
  }

  console.debug(weatherData);
  return { weather: weatherData, geoLocation: geoLocation };
}

export function isEmptyLonLat() {
  return isEmpty(longitude) || isEmpty(latitude);
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
    return {
      description: "No weather info",
      icon: {
        source: {
          light: "menubar-icon.png",
          dark: "menubar-icon@dark.png",
        },
      },
    };
  }
  switch (weatherCode) {
    case 0:
      return { description: "Clear sky", icon: Icon.Sun };
    case 1:
      return { description: "Mainly clear", icon: Icon.CloudSun };
    case 2:
      return { description: "Partly cloudy", icon: Icon.Cloud };
    case 3:
      return { description: "Overcast", icon: Icon.Cloud };
    case 45:
      return { description: "Fog", icon: Icon.Snippets };
    case 48:
      return { description: "Depositing rime fog", icon: Icon.Snippets };
    case 51:
      return { description: "Light drizzle", icon: Icon.CloudRain };
    case 53:
      return { description: "Moderate drizzle", icon: Icon.CloudRain };
    case 55:
      return { description: "Dense intensity drizzle", icon: Icon.CloudRain };
    case 56:
      return { description: "Light freezing drizzle", icon: Icon.CloudRain };
    case 57:
      return {
        description: "Dense intensity freezing drizzle",
        icon: Icon.CloudRain,
      };
    case 61:
      return { description: "Slight rain", icon: Icon.CloudRain };
    case 63:
      return { description: "Moderate rain", icon: Icon.CloudRain };
    case 65:
      return { description: "Heavy intensity rain", icon: Icon.CloudRain };
    case 66:
      return { description: "Light freezing rain", icon: Icon.CloudRain };
    case 67:
      return {
        description: "Heavy intensity freezing rain",
        icon: Icon.CloudRain,
      };
    case 71:
      return { description: "Slight snow fall", icon: Icon.CloudSnow };
    case 73:
      return { description: "Moderate snow fall", icon: Icon.CloudSnow };
    case 75:
      return { description: "Heavy intensity snow fall", icon: Icon.CloudSnow };
    case 77:
      return { description: "Snow grains", icon: Icon.CloudSnow };
    case 80:
      return { description: "Slight rain showers", icon: Icon.CloudRain };
    case 81:
      return { description: "Moderate rain showers", icon: Icon.CloudRain };
    case 82:
      return { description: "Violent rain showers", icon: Icon.CloudRain };
    case 85:
      return { description: "Slight snow showers", icon: Icon.CloudSnow };
    case 86:
      return { description: "Heavy snow showers", icon: Icon.CloudSnow };
    case 95:
      return {
        description: "Slight or moderate Thunderstorm",
        icon: Icon.CloudLightning,
      };
    case 96:
      return { description: "slight thunderstorm", icon: Icon.CloudLightning };
    case 99:
      return {
        description: "Heavy hail thunderstorm",
        icon: Icon.CloudLightning,
      };
    default:
      return {
        description: "No weather info",
        icon: {
          source: {
            light: "menubar-icon.png",
            dark: "menubar-icon@dark.png",
          },
        },
      };
  }
}

const windAngle2Direction = (windAngle: number) => {
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
