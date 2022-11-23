import axios from "axios";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../types/preferences";
import { GeoLocation, Weather } from "../types/types";
import { isEmpty } from "./common-utils";

export const CURRENT_WEATHER = "https://api.openweathermap.org/data/2.5/weather";
export const GEOCODING = "http://api.openweathermap.org/geo/1.0/direct";

export const { cityName, apiKey, unit, longitude, latitude } = getPreferenceValues<Preferences>();

export async function getGeoLocation(name: string): Promise<GeoLocation> {
  const geoLocation = await axios({
    method: "GET",
    url: GEOCODING,
    params: {
      q: name,
      limit: "1",
      appid: apiKey,
    },
  });
  const geo = geoLocation.data as GeoLocation[];

  return geo[0];
}

export async function getCurWeather() {
  let weatherData;
  let geoLocation;
  if (!isEmptyLonLat()) {
    weatherData = await axios({
      method: "GET",
      url: CURRENT_WEATHER,
      params: {
        lat: parseFloat(latitude),
        lon: parseFloat(longitude),
        appid: apiKey,
        units: unit,
      },
    });
    geoLocation = undefined;
  } else {
    geoLocation = await getGeoLocation(cityName);
    weatherData = await axios({
      method: "GET",
      url: CURRENT_WEATHER,
      params: {
        lat: geoLocation.lat,
        lon: geoLocation.lon,
        appid: apiKey,
        units: unit,
      },
    });
  }

  return { weather: weatherData.data as Weather, geoLocation: geoLocation };
}

export function isEmptyLonLat() {
  return isEmpty(longitude) || isEmpty(latitude);
}
