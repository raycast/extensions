import axios from "axios";
import { OpenMeteoWeather } from "../types/types";
import { precipitationUnits, tempUnits, windSpeedUnits } from "./weather-utils";

export const OPEN_METEO = "https://open-meteo.com/en";
const OPEN_METEO_WEATHER = "https://api.open-meteo.com/v1/forecast";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasNonEmptyArrays(record: Record<string, unknown>, keys: string[]) {
  return keys.every((key) => Array.isArray(record[key]) && (record[key] as unknown[]).length > 0);
}

export function isValidWeatherResponse(data: unknown): data is OpenMeteoWeather {
  if (!isRecord(data) || data.error === true) return false;
  const { current_weather, hourly, daily, hourly_units } = data;
  if (!isRecord(current_weather) || !isRecord(hourly_units) || !isRecord(hourly) || !isRecord(daily)) {
    return false;
  }
  if (
    typeof current_weather.temperature !== "number" ||
    typeof current_weather.windspeed !== "number" ||
    typeof current_weather.winddirection !== "number"
  ) {
    return false;
  }
  return (
    hasNonEmptyArrays(hourly, ["apparent_temperature", "relativehumidity_2m", "surface_pressure", "visibility"]) &&
    hasNonEmptyArrays(daily, ["temperature_2m_min", "temperature_2m_max", "uv_index_max", "sunrise", "sunset"])
  );
}

export async function getOpenMeteoWeather(lat: string, lon: string) {
  const axiosResponse = await axios({
    method: "GET",
    url: OPEN_METEO_WEATHER,
    params: {
      latitude: lat,
      longitude: lon,
      hourly:
        "temperature_2m,relativehumidity_2m,apparent_temperature,precipitation,rain,weathercode,surface_pressure,visibility,winddirection_10m",
      models: "best_match",
      daily:
        "weathercode,windspeed_10m_max,winddirection_10m_dominant,temperature_2m_max,temperature_2m_min,sunrise,sunset,rain_sum,uv_index_max",
      current_weather: true,
      temperature_unit: tempUnits,
      windspeed_unit: windSpeedUnits,
      precipitation_unit: precipitationUnits,
      timezone: "auto",
    },
  });
  if (!isValidWeatherResponse(axiosResponse.data)) {
    throw new Error("Invalid weather data returned from Open-Meteo");
  }
  return axiosResponse.data;
}
