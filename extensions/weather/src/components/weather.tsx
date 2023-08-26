import { ActionPanel, getPreferenceValues, List, Action, Icon } from "@raycast/api";
import moment from "moment";
import React, { ReactElement, useEffect, useState } from "react";
import { WeatherIcons, getWeatherCodeIcon } from "../icons";
import { getTemperatureUnit, getWttrTemperaturePostfix } from "../unit";
import { getErrorMessage } from "../utils";
import {
  Weather,
  WeatherConditions,
  WeatherData,
  getCurrentFeelLikeTemperature,
  getCurrentHumidity,
  getCurrentUVIndex,
  getCurrentVisibility,
  getCurrentWindConditions,
  wttr,
} from "../wttr";
import { DayList } from "./day";

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
  let i = 0;
  for (const e of Object.keys(oc)) {
    const count = oc[e];
    if (count > highestValue) {
      highestName = e;
      highestValue = count;
    }
    i++;
  }
  return highestName;
}

export function getDayTemperature(day: WeatherData, prefix: string): string {
  const unit = getWttrTemperaturePostfix();
  const key = `${prefix}temp${unit}`;
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
  return (
    <List.Item
      key={data.date}
      title={wd}
      icon={getWeatherCodeIcon(weatherCode || "")}
      accessories={[
        { text: max, icon: Icon.ArrowUp, tooltip: `Max. Temperature ${max}` },
        { text: min, icon: Icon.ArrowDown, tooltip: `Min. Temperature ${min}` },
      ]}
      actions={
        <ActionPanel>
          <Action.Push title="Show Details" target={<DayList day={data} title={`${props.title} - ${wd}`} />} />
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
} {
  if (!data) {
    return { title: "?", curcon: undefined, weatherDesc: undefined };
  }
  const area = data.nearest_area[0];
  const curcon = data.current_condition[0];

  const title = `${area.areaName[0].value}, ${area.region[0].value}, ${area.country[0].value}`;
  const weatherDesc = curcon ? curcon.weatherDesc[0].value : undefined;
  return { title, curcon, weatherDesc };
}

export function getCurrentTemperature(curcon: WeatherConditions | undefined): string | undefined {
  if (!curcon) {
    return;
  }

  const key = `temp_${getWttrTemperaturePostfix()}`;
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
    <List.Item title="Feels Like" icon={WeatherIcons.FeelsLike} accessories={[{ text: feelsLike.valueAndUnit }]} />
  );
}

function UVIndexItem(props: { curcon: WeatherConditions | undefined }) {
  const uvIndex = getCurrentUVIndex(props.curcon);
  if (!uvIndex) {
    return null;
  }
  return <List.Item title="UV Index" icon={WeatherIcons.UVIndex} accessories={[{ text: uvIndex }]} />;
}

function HumidityItem(props: { curcon: WeatherConditions | undefined }) {
  const hum = getCurrentHumidity(props.curcon);
  if (!hum) {
    return null;
  }
  return <List.Item title="Humidity" icon={WeatherIcons.Humidity} accessories={[{ text: hum.valueAndUnit }]} />;
}

function WindSpeedItem(props: { curcon: WeatherConditions | undefined }) {
  const wind = getCurrentWindConditions(props.curcon);
  if (!wind) {
    return null;
  }
  return (
    <List.Item title="Wind Speed" icon={WeatherIcons.Wind} accessories={[{ text: `${wind.speed} ${wind.unit}` }]} />
  );
}

function WindDirectionItem(props: { curcon: WeatherConditions | undefined }) {
  const wind = getCurrentWindConditions(props.curcon);
  if (!wind) {
    return null;
  }
  return (
    <List.Item
      title="Wind Direction"
      icon={WeatherIcons.Wind}
      accessories={[{ text: wind.dirIcon }, { text: wind.dirText }]}
    />
  );
}

function VisibilityItem(props: { curcon: WeatherConditions | undefined }) {
  const vis = getCurrentVisibility(props.curcon);
  if (!vis) {
    return null;
  }
  return <List.Item title="Visibility" icon={WeatherIcons.Visibility} accessories={[{ text: vis.distanceAndUnit }]} />;
}

function WeatherCurrentListItemFragment(props: { data: Weather | undefined }): ReactElement | null {
  const data = props.data;
  if (!data) {
    return null;
  }
  const { title, curcon, weatherDesc } = getMetaData(data);
  const windCon = getCurrentWindConditions(curcon);

  return (
    <React.Fragment>
      <List.Section title={`Weather report (${title})`}>
        <List.Item
          key="_"
          title={getCurrentTemperature(curcon) || ""}
          subtitle={weatherDesc}
          icon={{ value: getWeatherCodeIcon(curcon?.weatherCode), tooltip: weatherDesc || "" }}
          accessories={[
            {
              icon: "💧",
              text: curcon ? `${curcon.humidity}%` : "?",
            },
            {
              icon: "💨",
              text: windCon ? `${windCon.speed} ${windCon.unit} ${windCon.dirIcon}` : "?",
            },
          ]}
        />
        <FeelsLikeItem curcon={curcon} />
        <UVIndexItem curcon={curcon} />
        <HumidityItem curcon={curcon} />
        <WindSpeedItem curcon={curcon} />
        <WindDirectionItem curcon={curcon} />
        <VisibilityItem curcon={curcon} />
      </List.Section>
    </React.Fragment>
  );
}

function WeatherDailyForecaseFragment(props: { data: Weather | undefined }): ReactElement | null {
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

export function WeatherList(): JSX.Element {
  const [query, setQuery] = useState<string>("");
  const { data, error, isLoading } = useWeather(query);
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
          <WeatherDailyForecaseFragment data={data} />
        </React.Fragment>
      )}
    </List>
  );
}

export function getDefaultQuery(): string | undefined {
  const pref = getPreferenceValues();
  const q = (pref.defaultquery as string) || undefined;
  return q;
}

export function useWeather(query: string | undefined): {
  data: Weather | undefined;
  error?: string;
  isLoading: boolean;
} {
  const [data, setData] = useState<Weather>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  let cancel = false;

  useEffect(() => {
    async function fetchData() {
      if (!query) {
        const dq = getDefaultQuery();
        if (dq && dq.length > 0) {
          query = dq;
        }
      }
      if (query === null || cancel) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const wdata = await wttr.getWeather(query);
        if (!cancel) {
          setData(wdata);
        }
      } catch (e: any) {
        if (!cancel) {
          setError(getErrorMessage(e));
        }
      } finally {
        if (!cancel) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancel = true;
    };
  }, [query]);

  return { data, error, isLoading };
}
