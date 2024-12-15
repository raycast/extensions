import axios from "axios";
import { OpenMeteoWeather } from "../types/types";
import { precipitationUnits, tempUnits, windSpeedUnits } from "./weather-utils";

export const OPEN_METEO = "https://open-meteo.com/en";
const OPEN_METEO_WEATHER = "https://api.open-meteo.com/v1/forecast";

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
  return axiosResponse.data as OpenMeteoWeather;
}
