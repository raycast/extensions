import { calculateAqi } from "../aqi";
import { AirQualitySnapshot, AqiScale, Pollutants } from "../types";
import { fetchJson } from "./http";

type AirQualityResponse = {
  current?: {
    time?: string;
    us_aqi?: number;
    european_aqi?: number;
    pm10?: number;
    pm2_5?: number;
    carbon_monoxide?: number;
    nitrogen_dioxide?: number;
    sulphur_dioxide?: number;
    ozone?: number;
    dust?: number;
    uv_index?: number;
    uv_index_clear_sky?: number;
  };
};

const AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";

export async function fetchOpenMeteoAirQuality(
  latitude: number,
  longitude: number,
  preferredScale: AqiScale,
): Promise<AirQualitySnapshot> {
  const url = new URL(AIR_QUALITY_URL);
  url.searchParams.set("latitude", latitude.toFixed(4));
  url.searchParams.set("longitude", longitude.toFixed(4));
  url.searchParams.set(
    "current",
    "us_aqi,european_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,dust,uv_index,uv_index_clear_sky",
  );

  const result = await fetchJson<AirQualityResponse>(url.toString());
  const current = result.current;
  if (!current) {
    throw new Error("Air quality data unavailable.");
  }
  const pm10 = Number.isFinite(current.pm10) ? (current.pm10 as number) : null;
  const pm25 = Number.isFinite(current.pm2_5) ? (current.pm2_5 as number) : null;
  const usAqi = Number.isFinite(current.us_aqi) ? (current.us_aqi as number) : null;
  const europeanAqi = Number.isFinite(current.european_aqi) ? (current.european_aqi as number) : null;
  const pollutants: Pollutants = {
    carbonMonoxide: Number.isFinite(current.carbon_monoxide) ? (current.carbon_monoxide as number) : null,
    nitrogenDioxide: Number.isFinite(current.nitrogen_dioxide) ? (current.nitrogen_dioxide as number) : null,
    sulphurDioxide: Number.isFinite(current.sulphur_dioxide) ? (current.sulphur_dioxide as number) : null,
    ozone: Number.isFinite(current.ozone) ? (current.ozone as number) : null,
    dust: Number.isFinite(current.dust) ? (current.dust as number) : null,
    uvIndex: Number.isFinite(current.uv_index) ? (current.uv_index as number) : null,
    uvIndexClearSky: Number.isFinite(current.uv_index_clear_sky) ? (current.uv_index_clear_sky as number) : null,
  };

  let aqi: number | null = null;
  let aqiScale: AqiScale | null = null;
  if (preferredScale === "european") {
    if (europeanAqi !== null) {
      aqi = Math.round(europeanAqi);
      aqiScale = "european";
    } else if (usAqi !== null) {
      aqi = Math.round(usAqi);
      aqiScale = "us";
    }
  } else {
    if (usAqi !== null) {
      aqi = Math.round(usAqi);
      aqiScale = "us";
    } else if (europeanAqi !== null) {
      aqi = Math.round(europeanAqi);
      aqiScale = "european";
    }
  }

  if (aqi === null && pm10 !== null && pm25 !== null) {
    aqi = calculateAqi(pm25, pm10);
    aqiScale = "us";
  }
  if (aqi === null || aqiScale === null) {
    throw new Error("Air quality readings missing.");
  }

  return {
    aqi,
    aqiUs: usAqi !== null ? Math.round(usAqi) : null,
    aqiEu: europeanAqi !== null ? Math.round(europeanAqi) : null,
    pm10,
    pm25,
    timeIso: current.time,
    source: "open-meteo",
    aqiScale,
    pollutants,
  };
}
