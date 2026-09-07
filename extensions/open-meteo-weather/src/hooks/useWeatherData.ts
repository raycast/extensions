import { useFetch } from "@raycast/utils";
import { useCallback } from "react";
import {
  AirQuality,
  Forecast,
  GeoResult,
  NwsAlert,
  NwsAlertResponse,
  Units,
  airQualityUrl,
  forecastUrl,
  normalizeForecast,
  nwsAlertsUrl,
} from "../lib/api";

export interface WeatherData {
  forecast: Forecast | undefined;
  airQuality: AirQuality | undefined;
  /** Active NWS severe-weather alerts. Always empty outside the US. */
  alerts: NwsAlert[];
  isLoading: boolean;
  /** Set when the forecast request failed and no data is available for this location. */
  error: Error | undefined;
  revalidate: () => void;
}

/**
 * All remote data for one location: forecast (+nowcast +yesterday), air quality, US alerts.
 *
 * `keepPreviousData` is deliberately off: the views pair this data with the
 * active place by name, so showing the previous city's numbers under the new
 * city's label while its request is in flight would be wrong. Previously
 * visited locations still render instantly from the response cache, and
 * periodic revalidation keeps the current data on screen.
 */
export function useWeatherData(active: GeoResult | undefined, units: Units, days: number): WeatherData {
  const forecast = useFetch(active ? forecastUrl(active.latitude, active.longitude, units, days) : "", {
    execute: active !== undefined,
    parseResponse: async (res): Promise<Forecast> => {
      if (!res.ok) {
        // Open-Meteo answers errors with { error: true, reason }.
        const reason = await res
          .json()
          .then((b) => (b as { reason?: string }).reason)
          .catch(() => undefined);
        throw new Error(`Forecast request failed (${res.status})${reason ? `: ${reason}` : ""}`);
      }
      return normalizeForecast((await res.json()) as Forecast);
    },
  });

  const airQuality = useFetch<AirQuality>(active ? airQualityUrl(active.latitude, active.longitude) : "", {
    execute: active !== undefined,
    onError: () => {
      // Air quality is a nice-to-have; never surface its failures.
    },
  });

  const isUs = active?.country_code === "US";
  const alerts = useFetch<NwsAlertResponse>(active && isUs ? nwsAlertsUrl(active.latitude, active.longitude) : "", {
    execute: active !== undefined && isUs,
    headers: { Accept: "application/geo+json", "User-Agent": "raycast-weather-extension" },
    onError: () => {
      // NWS hiccups shouldn't break the forecast view.
    },
  });

  const revalidateForecast = forecast.revalidate;
  const revalidateAirQuality = airQuality.revalidate;
  const revalidateAlerts = alerts.revalidate;
  const revalidate = useCallback(() => {
    revalidateForecast();
    revalidateAirQuality();
    if (isUs) revalidateAlerts();
  }, [revalidateForecast, revalidateAirQuality, revalidateAlerts, isUs]);

  return {
    forecast: forecast.data,
    airQuality: airQuality.data,
    alerts: isUs ? (alerts.data?.features ?? []) : [],
    isLoading: forecast.isLoading,
    error: forecast.data ? undefined : forecast.error,
    revalidate,
  };
}
