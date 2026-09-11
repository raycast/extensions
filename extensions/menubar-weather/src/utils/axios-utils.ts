import axios from "axios";
import { OpenMeteoWeather } from "../types/types";
import { precipitationUnits, tempUnits, windSpeedUnits } from "./weather-utils";

export const OPEN_METEO = "https://open-meteo.com/en";
const OPEN_METEO_WEATHER = "https://api.open-meteo.com/v1/forecast";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const HOURLY_INDEXED_KEYS = ["apparent_temperature", "relativehumidity_2m", "surface_pressure", "visibility"];
const DAILY_NUMBER_KEYS = [
  "weathercode",
  "windspeed_10m_max",
  "winddirection_10m_dominant",
  "temperature_2m_max",
  "temperature_2m_min",
  "rain_sum",
  "uv_index_max",
];
const DAILY_STRING_KEYS = ["time", "sunrise", "sunset"];
const HOURLY_UNIT_KEYS = ["relativehumidity_2m", "surface_pressure", "visibility"];

// The menu command renders 24 hours (timeHour() is 0-23), so hourly arrays
// must cover the current-hour index and every entry be a number or null.
function isIndexedNumberArray(value: unknown): value is (number | null)[] {
  return (
    Array.isArray(value) && value.length >= 24 && value.every((entry) => typeof entry === "number" || entry === null)
  );
}

function isNumberOrNullArray(value: unknown): value is (number | null)[] {
  return (
    Array.isArray(value) && value.length > 0 && value.every((entry) => typeof entry === "number" || entry === null)
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every((entry) => typeof entry === "string");
}

export function isValidWeatherResponse(data: unknown): data is OpenMeteoWeather {
  if (!isRecord(data) || data.error === true) return false;
  const { current_weather, hourly, daily, hourly_units, daily_units } = data;
  if (!isRecord(current_weather) || !isRecord(hourly) || !isRecord(daily) || !isRecord(hourly_units)) {
    return false;
  }

  if (
    typeof current_weather.temperature !== "number" ||
    typeof current_weather.windspeed !== "number" ||
    typeof current_weather.winddirection !== "number" ||
    typeof current_weather.weathercode !== "number" ||
    typeof current_weather.time !== "string"
  ) {
    return false;
  }

  if (!HOURLY_INDEXED_KEYS.every((key) => isIndexedNumberArray(hourly[key]))) return false;
  if (!HOURLY_UNIT_KEYS.every((key) => typeof hourly_units[key] === "string")) return false;

  if (!DAILY_STRING_KEYS.every((key) => isStringArray(daily[key]))) return false;
  if (!DAILY_NUMBER_KEYS.every((key) => isNumberOrNullArray(daily[key]))) return false;

  // Forecast submenus map over each numeric array but index daily.time at the
  // same position, so all daily arrays must have the same length.
  const dayCount = (daily.time as unknown[]).length;
  const allDailyKeys = [...DAILY_STRING_KEYS, ...DAILY_NUMBER_KEYS];
  if (!allDailyKeys.every((key) => (daily[key] as unknown[]).length === dayCount)) return false;

  if (daily_units !== undefined && (!isRecord(daily_units) || typeof daily_units.rain_sum !== "string")) {
    return false;
  }

  return true;
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
