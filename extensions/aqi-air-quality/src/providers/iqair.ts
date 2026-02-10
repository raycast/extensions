import { AirQualitySnapshot } from "../types";
import { fetchJson } from "./http";

type IqairPollution = {
  ts?: string;
  aqius?: number;
  p1?: {
    conc?: number;
  };
  p2?: {
    conc?: number;
  };
};

type IqairForecast = {
  ts?: string;
  aqius?: number;
  pm10?: number;
  pm25?: number;
  pm2_5?: number;
};

type IqairResponse = {
  status?: string;
  data?: {
    current?: {
      pollution?: IqairPollution;
    };
    forecasts?: IqairForecast[];
  };
};

const IQAIR_URL = "https://api.airvisual.com/v2/nearest_city";

function toFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function fetchIqairAirQuality(
  latitude: number,
  longitude: number,
  apiKey: string,
): Promise<AirQualitySnapshot> {
  const url = new URL(IQAIR_URL);
  url.searchParams.set("lat", latitude.toFixed(4));
  url.searchParams.set("lon", longitude.toFixed(4));
  url.searchParams.set("key", apiKey);

  const result = await fetchJson<IqairResponse>(url.toString());

  const pollution = result.data?.current?.pollution;
  const aqi = toFiniteNumber(pollution?.aqius);
  if (aqi === null) {
    throw new Error("IQAIR data unavailable.");
  }

  let pm10 = toFiniteNumber(pollution?.p1?.conc);
  let pm25 = toFiniteNumber(pollution?.p2?.conc);
  let timeIso = pollution?.ts;

  if (pm10 === null || pm25 === null) {
    const forecast = result.data?.forecasts?.[0];
    const forecastPm25 = toFiniteNumber(forecast?.pm25 ?? forecast?.pm2_5);
    const forecastPm10 = toFiniteNumber(forecast?.pm10);
    pm10 = pm10 ?? forecastPm10;
    pm25 = pm25 ?? forecastPm25;
    if (!timeIso && forecast?.ts) {
      timeIso = forecast.ts;
    }
  }

  return {
    aqi: Math.round(aqi),
    aqiUs: Math.round(aqi),
    aqiEu: null,
    pm10,
    pm25,
    timeIso,
    source: "iqair",
    aqiScale: "us",
    pollutants: null,
  };
}
