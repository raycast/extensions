import axios from "axios";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../types/preferences";
import { GeoLocation, Weather } from "../types/types";

export const CURRENT_WEATHER = "https://api.openweathermap.org/data/2.5/weather";
export const GEOCODING = "http://api.openweathermap.org/geo/1.0/direct";

const { cityName, apiKey, unit } = getPreferenceValues<Preferences>();

export async function getGeoLocation(): Promise<GeoLocation> {
  const geoLocation = await axios({
    method: "GET",
    url: GEOCODING,
    params: {
      q: cityName,
      limit: "1",
      appid: apiKey,
    },
  });
  const geo = geoLocation.data as GeoLocation[];

  return geo[0];
}

export async function getCurWeather() {
  const geoLocation = await getGeoLocation();

  const weatherData = await axios({
    method: "GET",
    url: CURRENT_WEATHER,
    params: {
      lat: geoLocation.lat,
      lon: geoLocation.lon,
      appid: apiKey,
      units: unit,
    },
  });

  return { weather: weatherData.data as Weather, geoLocation: geoLocation };
}
