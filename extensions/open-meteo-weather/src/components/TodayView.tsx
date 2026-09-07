import { Detail, Icon } from "@raycast/api";
import { useMemo } from "react";
import { WeatherActions } from "./WeatherActions";
import { WeatherSettings } from "../hooks/useWeatherSettings";
import {
  AirQuality,
  Forecast,
  GeoResult,
  degreesToCompass,
  fmt,
  formatPlace,
  pollenSummary,
  usAqiInfo,
} from "../lib/api";
import { formatClock, moonInfo } from "../lib/astro";
import { nextHours, nowHero, nowcastSteps, nowcastSummary, timeOf, yesterdayComparison } from "../lib/build";
import { labelFor } from "../lib/palettes";
import { buildNowShareSvg } from "../lib/share";
import { renderHero, renderHourlyStrip, renderLoadingCard, renderNowcast, svgToMarkdown } from "../lib/svg";
import { escapeMarkdown } from "../lib/text";
import { styleFor } from "../lib/themes";

/** Markdown panel width; the metadata sidebar takes the rest of the window. */
const HERO_WIDTH = 420;

const HOURS_SHOWN = 10;

export function TodayView(props: {
  settings: WeatherSettings;
  place: GeoResult;
  forecast: Forecast | undefined;
  airQuality: AirQuality | undefined;
  isLoading: boolean;
  /** Forecast failure with nothing to show. */
  error?: Error;
  /** Minute counter; the hero's clock line reads the current time. */
  tick: number;
  refresh: () => void;
}) {
  const { settings, place, forecast, airQuality, isLoading, error } = props;
  const { unitSymbol, windUnit, theme } = settings;

  const markdown = useMemo(() => {
    if (!forecast) {
      if (isLoading) {
        return svgToMarkdown(
          renderLoadingCard(formatPlace(place), "Fetching the forecast…", styleFor(theme, 0, true), HERO_WIDTH),
          "Loading",
        );
      }
      return `## Couldn't load the forecast\n\n${escapeMarkdown(error?.message ?? "Check your connection and try again.")}\n\nPress ⌘R to retry.`;
    }
    const opts = nowHero(forecast, place, theme, unitSymbol);
    const hero = renderHero({ ...opts, displayWidth: HERO_WIDTH });
    const strip = renderHourlyStrip(
      nextHours(forecast, HOURS_SHOWN),
      opts.style,
      `Next ${HOURS_SHOWN} hours`,
      HERO_WIDTH,
    );
    const parts = [svgToMarkdown(hero, "Current weather"), svgToMarkdown(strip, "Hourly forecast")];
    const steps = nowcastSteps(forecast);
    if (steps.some((s) => s.mm >= 0.1)) {
      parts.splice(
        1,
        0,
        svgToMarkdown(renderNowcast(steps, opts.style, nowcastSummary(forecast) ?? "Rain", HERO_WIDTH), "Rain nowcast"),
      );
    }
    return parts.join("\n\n");
  }, [forecast, place, unitSymbol, theme, isLoading, error, props.tick]);

  const summary = forecast
    ? `${formatPlace(place)}: ${Math.round(forecast.current.temperature_2m)}°${unitSymbol}, ${labelFor(forecast.current.weather_code)}, feels like ${fmt(forecast.current.apparent_temperature, "°")}`
    : undefined;

  const cur = forecast?.current;
  const nowcast = forecast ? nowcastSummary(forecast) : undefined;
  const vsYesterday = forecast ? yesterdayComparison(forecast) : undefined;
  const aqi = airQuality?.current.us_aqi;
  const pollen = pollenSummary(airQuality);
  const moon = moonInfo(new Date(), place.latitude, place.longitude, forecast?.utc_offset_seconds);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={formatPlace(place)}
      markdown={markdown}
      metadata={
        cur && forecast ? (
          <Detail.Metadata>
            {nowcast && <Detail.Metadata.Label title="Rain Nowcast" icon={Icon.CloudRain} text={nowcast} />}
            {vsYesterday && <Detail.Metadata.Label title="Vs Yesterday" icon={Icon.Temperature} text={vsYesterday} />}
            <Detail.Metadata.Label title="Humidity" icon={Icon.Raindrop} text={fmt(cur.relative_humidity_2m, "%")} />
            <Detail.Metadata.Label
              title="Wind"
              icon={Icon.Wind}
              text={`${fmt(cur.wind_speed_10m)} ${windUnit} ${degreesToCompass(cur.wind_direction_10m)}`}
            />
            <Detail.Metadata.Label title="Gusts" icon={Icon.Windsock} text={fmt(cur.wind_gusts_10m, ` ${windUnit}`)} />
            <Detail.Metadata.Label title="Pressure" icon={Icon.Gauge} text={fmt(cur.surface_pressure, " hPa")} />
            <Detail.Metadata.Label title="Cloud Cover" icon={Icon.Cloud} text={fmt(cur.cloud_cover, "%")} />
            <Detail.Metadata.Label title="UV Index" icon={Icon.Sun} text={fmt(cur.uv_index)} />
            {aqi != null && (
              <Detail.Metadata.TagList title="Air Quality">
                <Detail.Metadata.TagList.Item
                  text={`${Math.round(aqi)} · ${usAqiInfo(aqi).label}`}
                  color={usAqiInfo(aqi).color}
                />
              </Detail.Metadata.TagList>
            )}
            {pollen && <Detail.Metadata.Label title="Pollen" icon={Icon.Leaf} text={pollen} />}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Sunrise" icon={Icon.Sunrise} text={timeOf(forecast.daily.sunrise[0])} />
            <Detail.Metadata.Label title="Sunset" icon={Icon.Moonrise} text={timeOf(forecast.daily.sunset[0])} />
            <Detail.Metadata.Label
              title="Moon"
              icon={Icon.Moon}
              text={`${moon.phaseName} · ${Math.round(moon.illumination * 100)}%`}
            />
            {(moon.moonrise || moon.moonset) && (
              <Detail.Metadata.Label
                title="Moonrise / Moonset"
                icon={Icon.MoonUp}
                text={`${moon.moonrise ? formatClock(moon.moonrise, forecast.utc_offset_seconds) : "—"} / ${moon.moonset ? formatClock(moon.moonset, forecast.utc_offset_seconds) : "—"}`}
              />
            )}
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <WeatherActions
          settings={settings}
          refresh={props.refresh}
          summary={summary}
          shareSvg={forecast ? () => buildNowShareSvg(forecast, place, theme, unitSymbol, windUnit) : undefined}
        />
      }
    />
  );
}
