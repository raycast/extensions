import { Color, Icon, List } from "@raycast/api";
import { useMemo, useRef, useState } from "react";
import { Setup } from "./components/Onboarding";
import { RadarView } from "./components/RadarView";
import { TodayView } from "./components/TodayView";
import { WeatherActions } from "./components/WeatherActions";
import { useLiveClock } from "./hooks/useLiveClock";
import { useWeatherData } from "./hooks/useWeatherData";
import { WeatherSettings, useWeatherSettings } from "./hooks/useWeatherSettings";
import {
  AirQuality,
  Forecast,
  GeoResult,
  NwsAlert,
  degreesToCompass,
  fmt,
  formatPlace,
  pollenSummary,
  usAqiInfo,
} from "./lib/api";
import { moonInfo, formatClock } from "./lib/astro";
import { WEEKDAYS, dayHero, dayName, isoToDate, nowHero, timeOf, yesterdayComparison } from "./lib/build";
import { iconFor, labelFor, tagColorFor } from "./lib/conditions";
import { buildDayShareSvg, buildNowShareSvg } from "./lib/share";
import { renderHero, svgToMarkdown } from "./lib/svg";
import { escapeMarkdown } from "./lib/text";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function Command() {
  const settings = useWeatherSettings();
  const { locations, active, units } = settings;
  // Controlled so leftover text from the setup screen's city search (which
  // shares this view's search bar) doesn't filter the forecast list.
  const [searchText, setSearchText] = useState("");

  const { forecast, airQuality, alerts, isLoading, error, revalidate } = useWeatherData(
    active,
    units,
    settings.forecastDays,
  );
  const tick = useLiveClock(revalidate);

  if (locations.length === 0 || !active) {
    if (settings.isLoading) return <List isLoading />;
    return <Setup settings={settings} />;
  }

  if (settings.view === "today") {
    return (
      <TodayView
        settings={settings}
        place={active}
        forecast={forecast}
        airQuality={airQuality}
        isLoading={isLoading}
        error={error}
        tick={tick}
        refresh={revalidate}
      />
    );
  }

  if (settings.view === "radar") {
    return (
      <RadarView settings={settings} place={active} forecast={forecast} isLoading={isLoading} refresh={revalidate} />
    );
  }

  return (
    <List
      isShowingDetail
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={formatPlace(active)}
      searchBarAccessory={locations.length > 1 ? <LocationDropdown settings={settings} /> : undefined}
    >
      {!forecast && isLoading && (
        <List.EmptyView icon={Icon.CloudSun} title="Fetching the forecast…" description={formatPlace(active)} />
      )}
      {!forecast && !isLoading && (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Couldn't load the forecast"
          description={error?.message ?? "Check your connection and try again"}
          actions={<WeatherActions settings={settings} refresh={revalidate} />}
        />
      )}
      {forecast && (
        <>
          {alerts.length > 0 && (
            <List.Section title="Severe Weather Alerts">
              {alerts.map((alert) => (
                <AlertItem key={alert.id} alert={alert} settings={settings} refresh={revalidate} />
              ))}
            </List.Section>
          )}
          <List.Section title="Right Now">
            <NowItem
              forecast={forecast}
              airQuality={airQuality}
              place={active}
              settings={settings}
              refresh={revalidate}
              tick={tick}
            />
          </List.Section>
          <List.Section title={`${settings.forecastDays}-Day Forecast`}>
            {forecast.daily.time.map((_, i) => (
              <DayItem
                key={forecast.daily.time[i]}
                forecast={forecast}
                dayIndex={i}
                place={active}
                settings={settings}
                refresh={revalidate}
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

/**
 * Location picker in the search bar. Raycast calls `onChange` once on mount
 * with the natively preselected item, which is the first one, not `value`.
 * This dropdown mounts exactly when the second location is added, so acting
 * on that call would switch straight back to the first location.
 */
function LocationDropdown(props: { settings: WeatherSettings }) {
  const { locations, active, setActiveId } = props.settings;
  const mounted = useRef(false);
  if (!active) return null;
  return (
    <List.Dropdown
      tooltip="Location"
      value={String(active.id)}
      onChange={(v) => {
        if (!mounted.current) {
          mounted.current = true;
          return;
        }
        const id = Number(v);
        // Programmatic `value` changes echo back through onChange; only user picks should act.
        if (id !== active.id) setActiveId(id);
      }}
    >
      {locations.map((l) => (
        <List.Dropdown.Item key={l.id} title={formatPlace(l)} value={String(l.id)} icon={Icon.Pin} />
      ))}
    </List.Dropdown>
  );
}

function AlertItem(props: { alert: NwsAlert; settings: WeatherSettings; refresh: () => void }) {
  const p = props.alert.properties;
  const severe = p.severity === "Extreme" || p.severity === "Severe";
  // NWS text is hard-wrapped prose with stray *, # and _; render it literally.
  const prose = (text: string) => escapeMarkdown(text).replace(/\n/g, "  \n");
  const markdown = [
    `## ${escapeMarkdown(p.event)}`,
    p.headline ? `**${escapeMarkdown(p.headline)}**` : "",
    prose(p.description),
    p.instruction
      ? prose(p.instruction)
          .split("\n")
          .map((line) => `> ${line}`)
          .join("\n")
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  const ends = p.ends ?? p.expires;

  return (
    <List.Item
      title={p.event}
      icon={{ source: Icon.ExclamationMark, tintColor: severe ? Color.Red : Color.Orange }}
      accessories={[{ tag: { value: p.severity, color: severe ? Color.Red : Color.Orange } }]}
      detail={
        <List.Item.Detail
          markdown={markdown}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.TagList title="Severity">
                <List.Item.Detail.Metadata.TagList.Item text={p.severity} color={severe ? Color.Red : Color.Orange} />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Label title="Area" text={p.areaDesc} />
              {ends && <List.Item.Detail.Metadata.Label title="Ends" text={ends.slice(0, 16).replace("T", " ")} />}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <WeatherActions
          settings={props.settings}
          refresh={props.refresh}
          summary={`${p.event}: ${p.headline ?? p.areaDesc}`}
        />
      }
    />
  );
}

function NowItem(props: {
  forecast: Forecast;
  airQuality: AirQuality | undefined;
  place: GeoResult;
  settings: WeatherSettings;
  refresh: () => void;
  /** Minute counter; re-renders the hero so its clock line stays live. */
  tick: number;
}) {
  const { forecast, airQuality, place, settings } = props;
  const cur = forecast.current;
  const label = labelFor(cur.weather_code);
  const { unitSymbol, windUnit, theme } = settings;

  const markdown = useMemo(
    () => svgToMarkdown(renderHero(nowHero(forecast, place, theme, unitSymbol)), "Current weather"),
    [forecast, place, unitSymbol, theme, props.tick],
  );

  const summary = `${formatPlace(place)}: ${Math.round(cur.temperature_2m)}°${unitSymbol}, ${label}, feels like ${fmt(cur.apparent_temperature, "°")}`;
  const vsYesterday = yesterdayComparison(forecast);
  const aqi = airQuality?.current.us_aqi;
  const pollen = pollenSummary(airQuality);
  const moon = moonInfo(new Date(), place.latitude, place.longitude, forecast.utc_offset_seconds);

  return (
    <List.Item
      title="Now"
      keywords={["current", "conditions"]}
      subtitle={label}
      icon={{ source: iconFor(cur.weather_code), tintColor: tagColorFor(cur.weather_code) }}
      accessories={[{ text: `${Math.round(cur.temperature_2m)}°${unitSymbol}` }]}
      detail={
        <List.Item.Detail
          markdown={markdown}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Humidity"
                icon={Icon.Raindrop}
                text={fmt(cur.relative_humidity_2m, "%")}
              />
              <List.Item.Detail.Metadata.Label
                title="Wind"
                icon={Icon.Wind}
                text={`${fmt(cur.wind_speed_10m)} ${windUnit} ${degreesToCompass(cur.wind_direction_10m)}`}
              />
              <List.Item.Detail.Metadata.Label
                title="Gusts"
                icon={Icon.Windsock}
                text={fmt(cur.wind_gusts_10m, ` ${windUnit}`)}
              />
              <List.Item.Detail.Metadata.Label
                title="Pressure"
                icon={Icon.Gauge}
                text={fmt(cur.surface_pressure, " hPa")}
              />
              <List.Item.Detail.Metadata.Label title="Cloud Cover" icon={Icon.Cloud} text={fmt(cur.cloud_cover, "%")} />
              <List.Item.Detail.Metadata.TagList title="UV Index">
                <List.Item.Detail.Metadata.TagList.Item text={fmt(cur.uv_index)} color={uvColor(cur.uv_index)} />
              </List.Item.Detail.Metadata.TagList>
              {aqi != null && (
                <List.Item.Detail.Metadata.TagList title="Air Quality">
                  <List.Item.Detail.Metadata.TagList.Item
                    text={`${Math.round(aqi)} · ${usAqiInfo(aqi).label}`}
                    color={usAqiInfo(aqi).color}
                  />
                </List.Item.Detail.Metadata.TagList>
              )}
              {pollen && <List.Item.Detail.Metadata.Label title="Pollen" icon={Icon.Leaf} text={pollen} />}
              {vsYesterday && (
                <List.Item.Detail.Metadata.Label title="Vs Yesterday" icon={Icon.Temperature} text={vsYesterday} />
              )}
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Sunrise"
                icon={Icon.Sunrise}
                text={timeOf(forecast.daily.sunrise[0])}
              />
              <List.Item.Detail.Metadata.Label
                title="Sunset"
                icon={Icon.Moonrise}
                text={timeOf(forecast.daily.sunset[0])}
              />
              <List.Item.Detail.Metadata.Label
                title="Moon"
                icon={Icon.Moon}
                text={`${moon.phaseName} · ${Math.round(moon.illumination * 100)}%`}
              />
              {(moon.moonrise || moon.moonset) && (
                <List.Item.Detail.Metadata.Label
                  title="Moonrise / Moonset"
                  icon={Icon.MoonUp}
                  text={`${moon.moonrise ? formatClock(moon.moonrise, forecast.utc_offset_seconds) : "—"} / ${moon.moonset ? formatClock(moon.moonset, forecast.utc_offset_seconds) : "—"}`}
                />
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <WeatherActions
          settings={settings}
          refresh={props.refresh}
          summary={summary}
          shareSvg={() => buildNowShareSvg(forecast, place, theme, unitSymbol, windUnit)}
        />
      }
    />
  );
}

function DayItem(props: {
  forecast: Forecast;
  dayIndex: number;
  place: GeoResult;
  settings: WeatherSettings;
  refresh: () => void;
}) {
  const { forecast, dayIndex: d, place, settings } = props;
  const daily = forecast.daily;
  const code = daily.weather_code[d];
  const label = labelFor(code);
  const high = daily.temperature_2m_max[d];
  const low = daily.temperature_2m_min[d];
  const rain = daily.precipitation_probability_max[d] ?? 0;
  const { unitSymbol, windUnit, theme } = settings;

  const name = dayName(forecast, d);

  const markdown = useMemo(
    () => svgToMarkdown(renderHero(dayHero(forecast, d, place, theme, unitSymbol)), name),
    [forecast, place, d, unitSymbol, theme],
  );

  const accessories: List.Item.Accessory[] = [];
  if (rain >= 30) accessories.push({ tag: { value: `${rain}%`, color: Color.Blue }, tooltip: "Chance of rain" });
  accessories.push({ text: `${Math.round(low)}° / ${Math.round(high)}°` });

  const summary = `${name} in ${formatPlace(place)}: ${label}, high ${Math.round(high)}°${unitSymbol}, low ${Math.round(low)}°${unitSymbol}, rain ${rain}%`;

  // Let searches like "friday", "aug 29", or "29" find the day.
  const date = isoToDate(daily.time[d]);
  const keywords = [WEEKDAYS[date.getDay()], `${MONTHS[date.getMonth()]} ${date.getDate()}`, String(date.getDate())];

  const precipSum = daily.precipitation_sum[d] ?? 0;
  const snowSum = daily.snowfall_sum[d] ?? 0;

  return (
    <List.Item
      title={name}
      subtitle={label}
      keywords={keywords}
      icon={{ source: iconFor(code), tintColor: tagColorFor(code) }}
      accessories={accessories}
      detail={
        <List.Item.Detail
          markdown={markdown}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.TagList title="Temperature">
                <List.Item.Detail.Metadata.TagList.Item text={`H ${Math.round(high)}°`} color={Color.Orange} />
                <List.Item.Detail.Metadata.TagList.Item text={`L ${Math.round(low)}°`} color={Color.Blue} />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Label title="Chance of Rain" icon={Icon.Raindrop} text={`${rain}%`} />
              {(precipSum >= 0.1 || snowSum >= 0.1) && (
                <List.Item.Detail.Metadata.Label
                  title="Precipitation"
                  icon={Icon.CloudRain}
                  text={`${precipSum.toFixed(1)} mm${snowSum >= 0.1 ? ` · ${snowSum.toFixed(1)} cm snow` : ""}`}
                />
              )}
              <List.Item.Detail.Metadata.Label
                title="Max Wind"
                icon={Icon.Wind}
                text={`${Math.round(daily.wind_speed_10m_max[d])} ${windUnit}`}
              />
              <List.Item.Detail.Metadata.TagList title="UV Index">
                <List.Item.Detail.Metadata.TagList.Item
                  text={fmt(daily.uv_index_max[d])}
                  color={uvColor(daily.uv_index_max[d])}
                />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Sunrise" icon={Icon.Sunrise} text={timeOf(daily.sunrise[d])} />
              <List.Item.Detail.Metadata.Label title="Sunset" icon={Icon.Moonrise} text={timeOf(daily.sunset[d])} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <WeatherActions
          settings={settings}
          refresh={props.refresh}
          summary={summary}
          shareSvg={() => buildDayShareSvg(forecast, d, place, theme, unitSymbol, windUnit)}
        />
      }
    />
  );
}

function uvColor(uv: number): Color {
  if (uv >= 8) return Color.Red;
  if (uv >= 6) return Color.Orange;
  if (uv >= 3) return Color.Yellow;
  return Color.Green;
}
