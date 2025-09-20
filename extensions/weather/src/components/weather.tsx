import { Action, ActionPanel, Color, Icon, List, getPreferenceValues } from "@raycast/api";
import moment from "moment";
import React, { ReactElement, useState } from "react";
import { WeatherIcons, getWeatherCodeIcon } from "../icons";
import { getTemperatureUnit, getWttrTemperaturePostfix } from "../unit";
import { convertToRelativeDate } from "../utils";
import {
  Area,
  Weather,
  WeatherConditions,
  WeatherData,
  convertToTimeString,
  getAreaValues,
  getCurrentCloudCover,
  getCurrentFeelLikeTemperature,
  getCurrentMoon,
  getCurrentObservationTime,
  getCurrentPressure,
  getCurrentRain,
  getCurrentSun,
  getCurrentSunHours,
  getCurrentUVIndex,
  getCurrentVisibility,
  getCurrentWindConditions,
  getDaySnowInfo,
} from "../wttr";
import { DayList } from "./day";
import { useWeather } from "./hooks";

export interface WttrDay {
  date: string;
  title: string;
}

function getHighestOccurrence(arr: string[]): string | undefined {
  const oc: Record<string, number> = {};
  for (const e of arr) {
    if (e in oc) {
      oc[e] += 1;
    } else {
      oc[e] = 1;
    }
  }
  let highestName: string | undefined = undefined;
  let highestValue = 0;
  for (const e of Object.keys(oc)) {
    const count = oc[e];
    if (count > highestValue) {
      highestName = e;
      highestValue = count;
    }
  }
  return highestName;
}

export function getDayTemperature(day: WeatherData, prefix: string): string {
  const unit = getWttrTemperaturePostfix();
  const key = `${prefix}temp${unit}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rec = day as Record<string, any>;
  let val = "?";
  if (rec[key]) {
    val = `${rec[key]}`;
  }
  return `${val} ${getTemperatureUnit()}`;
}

function getDayWeatherCode(day: WeatherData): string | undefined {
  const weatherCodes = day.hourly.map((h) => h.weatherCode);
  const weatherCode = getHighestOccurrence(weatherCodes);
  return weatherCode;
}

export function getDayWeatherIcon(day: WeatherData): string {
  const code = getDayWeatherCode(day);
  return getWeatherCodeIcon(code || "");
}

export function DayListItem(props: { day: WeatherData; title: string }): JSX.Element {
  const data = props.day;
  const wd = getWeekday(data.date);
  const weatherCodes = data.hourly.map((h) => h.weatherCode);
  const weatherCode = getHighestOccurrence(weatherCodes);
  const max = getDayTemperature(data, "max");
  const min = getDayTemperature(data, "min");
  const snow = getDaySnowInfo(data);
  return (
    <List.Item
      key={data.date}
      title={wd}
      icon={{ source: getWeatherCodeIcon(weatherCode || ""), tintColor: Color.PrimaryText }}
      accessories={[
        {
          text: data.sunHour ? `${data.sunHour} h` : undefined,
          icon: { source: WeatherIcons.Sun, tintColor: Color.SecondaryText },
          tooltip: data.sunHour ? `Sun Hours: ${data.sunHour} h` : undefined,
        },
        {
          text: snow && snow.value > 0 ? snow.valueAndUnit : undefined,
          icon: snow && snow.value > 0 ? WeatherIcons.Snow : undefined,
          tooltip: snow && snow.value > 0 ? `Snow: ${snow.valueAndUnit}` : undefined,
        },
        { text: max, icon: Icon.ArrowUp, tooltip: `Max. Temperature ${max}` },
        { text: min, icon: Icon.ArrowDown, tooltip: `Min. Temperature ${min}` },
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Details"
            icon={Icon.List}
            target={<DayList day={data} title={`${props.title} - ${wd}`} />}
          />
        </ActionPanel>
      }
    />
  );
}

export function getWeekday(date: string): string {
  const d = moment(date);
  return d.locale("en").format("dddd");
}

export function getMetaData(data: Weather | undefined): {
  title: string;
  curcon: WeatherConditions | undefined;
  weatherDesc: string | undefined;
  area: Area | undefined;
} {
  if (!data) {
    return { title: "?", curcon: undefined, weatherDesc: undefined, area: undefined };
  }
  const area = data.nearest_area[0];
  const curcon = data.current_condition[0];

  const names = [area.areaName[0].value, area.region[0].value, area.country[0].value];
  const title = names
    .filter((n) => n && n.trim().length > 0)
    .map((n) => n.trim())
    .join(", ");
  const weatherDesc = curcon ? curcon.weatherDesc[0].value : undefined;
  return { title, curcon, weatherDesc, area };
}

export function getCurrentTemperature(curcon: WeatherConditions | undefined): string | undefined {
  if (!curcon) {
    return;
  }

  const key = `temp_${getWttrTemperaturePostfix()}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const f = curcon as Record<string, any>;
  let val = "?";
  if (f[key]) {
    val = f[key];
  }
  return `${val} ${getTemperatureUnit()}`;
}

function FeelsLikeItem(props: { curcon: WeatherConditions | undefined }) {
  const feelsLike = getCurrentFeelLikeTemperature(props.curcon);
  if (!feelsLike) {
    return null;
  }
  return (
    <List.Item
      title="Feels Like"
      icon={{ source: WeatherIcons.FeelsLike, tintColor: Color.PrimaryText }}
      accessories={[{ text: feelsLike.valueAndUnit }]}
    />
  );
}

function UVIndexItem(props: { curcon: WeatherConditions | undefined }) {
  const uvIndex = getCurrentUVIndex(props.curcon);
  if (!uvIndex) {
    return null;
  }
  return (
    <List.Item
      title="UV Index"
      icon={{ source: WeatherIcons.UVIndex, tintColor: Color.PrimaryText }}
      accessories={[{ text: uvIndex }]}
    />
  );
}

function VisibilityItem(props: { curcon: WeatherConditions | undefined }) {
  const vis = getCurrentVisibility(props.curcon);
  if (!vis) {
    return null;
  }
  return (
    <List.Item
      title="Visibility"
      icon={{ source: WeatherIcons.Visibility, tintColor: Color.PrimaryText }}
      accessories={[{ text: vis.distanceAndUnit }]}
    />
  );
}

function PressureItem(props: { curcon: WeatherConditions | undefined }) {
  const p = getCurrentPressure(props.curcon);
  if (!p) {
    return null;
  }
  return (
    <List.Item
      title="Pressure"
      icon={{ source: WeatherIcons.Pressure, tintColor: Color.PrimaryText }}
      accessories={[{ text: p.valueAndUnit }]}
    />
  );
}

function LocationItem(props: { area: Area | undefined }) {
  const a = getAreaValues(props.area);
  if (!a) {
    return null;
  }
  const coords = a.latitude && a.longitude ? `${a.longitude}, ${a.latitude}` : undefined;
  if (!coords) {
    return null;
  }
  return (
    <List.Item
      title="Coordinates"
      icon={{ source: WeatherIcons.Coordinates, tintColor: Color.PrimaryText }}
      accessories={[
        {
          text: coords,
          tooltip: `Location (Longitude, Latitude): ${coords}`,
        },
      ]}
    />
  );
}

function SunItem(props: { data: Weather | undefined }) {
  const s = getCurrentSun(props.data);
  if (!s) {
    return null;
  }
  return (
    <List.Item
      title="Sun"
      icon={{ source: WeatherIcons.Sun, tintColor: Color.PrimaryText }}
      accessories={[
        {
          icon: { source: WeatherIcons.Sunrise, tintColor: Color.PrimaryText },
          text: convertToTimeString(s.sunrise),
          tooltip: `Sunrise ${convertToTimeString(s.sunrise)}`,
        },
        {
          icon: { source: WeatherIcons.Sunset, tintColor: Color.PrimaryText },
          text: convertToTimeString(s.sunset),
          tooltip: `Sunset ${convertToTimeString(s.sunset)}`,
        },
      ]}
    />
  );
}

function MoonItem(props: { data: Weather | undefined }) {
  const m = getCurrentMoon(props.data);
  if (!m) {
    return null;
  }
  return (
    <List.Item
      title="Moon"
      subtitle={m.moonPhase}
      icon={{ source: WeatherIcons.Moon, tintColor: Color.PrimaryText }}
      accessories={[
        {
          icon: { source: WeatherIcons.Moonrise, tintColor: Color.SecondaryText },
          text: convertToTimeString(m.moonrise),
          tooltip: `Moonrise ${convertToTimeString(m.moonrise)}`,
        },
        {
          icon: { source: WeatherIcons.Moonset, tintColor: Color.SecondaryText },
          text: convertToTimeString(m.moonset),
          tooltip: `Moonset ${m.moonset}`,
        },
      ]}
    />
  );
}

function WeatherCurrentListItemFragment(props: { data: Weather | undefined }): ReactElement | null {
  const data = props.data;
  if (!data) {
    return null;
  }
  const { title, curcon, weatherDesc, area } = getMetaData(data);
  const observation = getCurrentObservationTime(curcon);
  const windCon = getCurrentWindConditions(curcon);

  const observationRelative = convertToRelativeDate(observation) || observation;
  const rain = getCurrentRain(curcon);
  const cloud = getCurrentCloudCover(curcon);
  const sun = getCurrentSunHours(data);

  return (
    <>
      <List.Section title={`Weather Report • ${title} ${observationRelative ? "• " + observationRelative : ""}`}>
        <List.Item
          title={getCurrentTemperature(curcon) || ""}
          subtitle={weatherDesc}
          icon={{ source: getWeatherCodeIcon(curcon?.weatherCode), tintColor: Color.PrimaryText }}
          accessories={[
            {
              text: sun ? sun.valueAndUnit : undefined,
              icon: { source: WeatherIcons.Sunrise, tintColor: Color.SecondaryText },
              tooltip: sun ? `Sun Hours: ${sun.valueAndUnit}` : undefined,
            },
            {
              text: cloud ? cloud.valueAndUnit : undefined,
              icon: { source: WeatherIcons.Cloud, tintColor: Color.SecondaryText },
              tooltip: cloud ? `Cloud Cover ${cloud.valueAndUnit}` : undefined,
            },
            {
              text: rain && rain.value > 0 ? rain.valueAndUnit : undefined,
              icon: rain && rain.value > 0 ? { source: WeatherIcons.Rain, tintColor: Color.SecondaryText } : "",
            },
            {
              icon: { source: WeatherIcons.Humidity, tintColor: Color.SecondaryText },
              text: curcon ? `${curcon.humidity}%` : "?",
              tooltip: curcon ? `Humidity: ${curcon.humidity}%` : "?",
            },
            {
              icon: { source: WeatherIcons.Wind, tintColor: Color.SecondaryText },
              text: windCon ? `${windCon.speed} ${windCon.unit} ${windCon.dirIcon} (${windCon.dirText})` : "?",
              tooltip: windCon ? `Wind ${windCon.speed}${windCon.unit} ${windCon.dirIcon} (${windCon.dirText})` : "?",
            },
          ]}
        />
        <FeelsLikeItem curcon={curcon} />
        <UVIndexItem curcon={curcon} />
        <PressureItem curcon={curcon} />
        <VisibilityItem curcon={curcon} />
        <LocationItem area={area} />
        <SunItem data={data} />
        <MoonItem data={data} />
      </List.Section>
    </>
  );
}

function WeatherDailyForecastFragment(props: { data: Weather | undefined }): ReactElement | null {
  const data = props.data;
  if (!data) {
    return null;
  }
  const { title } = getMetaData(data);
  return (
    <List.Section title="Daily Forecast">
      {data?.weather?.map((d) => <DayListItem key={d.date} day={d} title={title} />)}
    </List.Section>
  );
}

export function WeatherListOrDay(props: { day?: WttrDay }): JSX.Element {
  const [query, setQuery] = useState<string>("");
  const { data, error, isLoading } = useWeather(query);
  if (props.day) {
    const day = data?.weather.find((w) => w.date === props.day?.date);
    if (day) {
      return <DayList isLoading={isLoading} title={props.day.title} day={day} />;
    }
    return (
      <List isLoading={isLoading} onSearchTextChange={setQuery} throttle>
        {error && <List.EmptyView title="Could not fetch data from wttr.in" icon="⛈️" description={error} />}
      </List>
    );
  } else {
    return (
      <List
        isLoading={isLoading}
        searchBarPlaceholder="Search for other location (e.g. London)"
        onSearchTextChange={setQuery}
        throttle
      >
        {error ? (
          <List.EmptyView title="Could not fetch data from wttr.in" icon="⛈️" description={error} />
        ) : (
          <React.Fragment>
            <WeatherCurrentListItemFragment data={data} />
            <WeatherDailyForecastFragment data={data} />
          </React.Fragment>
        )}
      </List>
    );
  }
}

export function getDefaultQuery(): string | undefined {
  const pref = getPreferenceValues();
  const q = (pref.defaultquery as string) || undefined;
  return q;
}
