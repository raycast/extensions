import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { useEffect, useState } from "react";
import { getUnitSystem, UnitSystem } from "./unit";
import { getErrorMessage } from "./utils";
import { URLSearchParams } from "url";

const endpoint = "https://api.openweathermap.org";

export interface Coordinates {
  lat: number;
  lon: number;
}

interface Location {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state: string | undefined;
}

export interface WeatherPoint {
  id: number;
  main: string;
  description: string;
  icon: string;
}

export interface DailyTemperature {
  day: number;
  min: number;
  max: number;
  night: number;
  eve: number;
  morn: number;
}

export interface DailyFeelsLike {
  day: number;
  night: number;
  eve: number;
  morn: number;
}

export interface Rain {
  "1h": number;
}

export interface Daily {
  dt: number;
  sunrise: number;
  sunset: number;
  moonrise: number;
  moonset: number;
  moon_phase: number;
  temp: DailyTemperature;
  feels_like: DailyFeelsLike;
  pressure: number;
  humidity: number;
  dew_point: number;
  wind_speed: number;
  wind_deg: number;
  wind_gust: number;
  weather: WeatherPoint[];
  clouds: number;
  pop: number;
  rain: number;
  uvi: number;
}

export interface Hourly {
  dt: number;
  temp: number;
  feels_like: number;
  pressure: number;
  humidity: number;
  dew_point: number;
  uvi: number;
  clouds: number;
  visibility: number;
  wind_speed: number;
  wind_deg: number;
  wind_gust: number;
  weather: WeatherPoint[];
  pop: number;
  rain: Rain;
}

export interface Current {
  dt: number;
  sunrise: number;
  sunset: number;
  temp: number;
  feels_like: number;
  pressure: number;
  humidity: number;
  dew_point: number;
  uvi: number;
  clouds: number;
  visibility: number;
  wind_speed: number;
  wind_deg: number;
  wind_gust: number;
  weather: WeatherPoint[];
  rain: Rain;
}

export interface Weather {
  lat: number;
  lon: number;
  timezone: string;
  timezone_offset: number;
  current: Current;
  hourly: Hourly[];
  daily: Daily[];
}

export interface WeatherRequest {
  weather: Weather;
  location: Location | undefined;
}

function getAPIKey(): string {
  const pref = getPreferenceValues();
  return (pref.apikey as string) || "";
}

export function getDefaultQuery(): string {
  const pref = getPreferenceValues();
  return (pref.defaultquery as string) || "";
}

export async function getGeocoding(query: string): Promise<Location[]> {
  const APIKey = getAPIKey();
  const params: URLSearchParams = new URLSearchParams({ appid: APIKey, q: query });

  const url = `${endpoint}/geo/1.0/direct?${params.toString()}`;
  const locations: Location[] | undefined = await fetch(url)
    .then((d) => d.json())
    .then((d) => {
      const a = d as any;
      if (a.cod && a.message) {
        throw Error(a.message as string);
      }
      return d as Location[];
    });
  if (locations === undefined || locations.length < 1) {
    throw Error("Could not find location");
  }
  return locations;
}

export function getIconURL(code: string): string {
  return `https://openweathermap.org/img/wn/${code}@2x.png`;
}

export async function getWeather(coords: Coordinates): Promise<Weather> {
  const APIKey = getAPIKey();
  const us = getUnitSystem();
  const params: URLSearchParams = new URLSearchParams({
    appid: APIKey,
    lat: coords.lat.toString(),
    lon: coords.lon.toString(),
    units: us === UnitSystem.Imperial ? "imperial" : "metric",
  });

  const url = `${endpoint}/data/3.0/onecall?${params.toString()}`;
  const w: Weather | undefined = await fetch(url)
    .then((d) => d.json())
    .then((d) => {
      const a = d as any;
      if (a.cod && a.message) {
        throw Error(a.message as string);
      }
      return d as Weather;
    });
  if (w === undefined) {
    throw Error("Could not fetch weather");
  }
  return w;
}

function queryToLatLong(query: string): Coordinates | undefined {
  const splits = query.split(",");
  if (splits.length === 2) {
    const lat = parseFloat(splits[0]);
    const lon = parseFloat(splits[1]);
    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      return undefined;
    } else {
      return { lat, lon };
    }
  }
  return undefined;
}

export function useWeather(query: string | undefined): {
  weatherRequest: WeatherRequest | undefined;
  isLoading: boolean;
  error: string | undefined;
} {
  const [weatherRequest, setWeatherRequest] = useState<WeatherRequest>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  useEffect(() => {
    let didUnmount = false;
    const fetchData = async () => {
      try {
        if (query && query.length > 0) {
          setIsLoading(true);
          const coords = queryToLatLong(query);
          if (coords) {
            const w = await getWeather(coords);
            if (!didUnmount) {
              setWeatherRequest({ weather: w, location: undefined });
            }
          } else {
            const locations = await getGeocoding(query);
            const loc = locations[0];
            const w = await getWeather(loc);
            if (!didUnmount) {
              setWeatherRequest({ weather: w, location: loc });
            }
          }
        }
      } catch (error) {
        if (!didUnmount) {
          setError(getErrorMessage(error));
          setIsLoading(false);
        }
      } finally {
        if (!didUnmount) {
          setIsLoading(false);
          if (error) {
            setError(undefined);
          }
        }
      }
    };
    fetchData();
    return () => {
      didUnmount = true;
    };
  }, [query]);
  return { weatherRequest, isLoading, error };
}

const defaultHourlyForecastCount = 3;

export function getHourlyForecastCountPreference(): number {
  const pref = getPreferenceValues();
  const userValue = (pref.hourlyforecastcount as string) || "";
  if (userValue === undefined || userValue.length <= 0) {
    return defaultHourlyForecastCount;
  }
  let val = parseFloat(userValue);
  if (Number.isNaN(val)) {
    return defaultHourlyForecastCount;
  }
  if (val < 0) {
    val = 0;
  }
  return val;
}

const defaultDailyForecastCount = 7;

export function getDailyForecastCountPreference(): number {
  const pref = getPreferenceValues();
  const userValue = (pref.dailyforecastcount as string) || "";
  if (userValue === undefined || userValue.length <= 0) {
    return defaultDailyForecastCount;
  }
  let val = parseFloat(userValue);
  if (Number.isNaN(val)) {
    return defaultDailyForecastCount;
  }
  if (val < 0) {
    val = 0;
  }
  return val;
}
