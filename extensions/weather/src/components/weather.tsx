import { ActionPanel, getPreferenceValues, List, Action } from "@raycast/api";
import moment from "moment";
import React, { ReactElement, useEffect, useState } from "react";
import { getIcon, getWindDirectionIcon } from "../icons";
import { getTemperatureUnit, getWindUnit, getWttrTemperaturePostfix, getWttrWindPostfix } from "../unit";
import { getErrorMessage } from "../utils";
import { Weather, WeatherConditions, WeatherData, wttr } from "../wttr";
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

export function DayListItem(props: { day: WeatherData; title: string }) {
  const data = props.day;
  const wd = getWeekday(data.date);
  const getTemp = (prefix: string) => {
    const unit = getWttrTemperaturePostfix();
    const key = `${prefix}temp${unit}`;
    const rec = data as Record<string, any>;
    let val = "?";
    if (rec[key]) {
      val = `${rec[key]}`;
    }
    return `${val} ${getTemperatureUnit()}`;
  };
  const weatherCodes = data.hourly.map((h) => h.weatherCode);
  const weatherCode = getHighestOccurrence(weatherCodes);
  return (
    <List.Item
      key={data.date}
      title={wd}
      subtitle={`max: ${getTemp("max")}, min: ${getTemp("min")}`}
      icon={getIcon(weatherCode || "")}
      actions={
        <ActionPanel>
          <Action.Push title="Show Details" target={<DayList day={data} title={`${props.title} - ${wd}`} />} />
        </ActionPanel>
      }
    />
  );
}

function getWeekday(date: string): string {
  const d = moment(date);
  return d.locale("en").format("dddd");
}

function getMetaData(data: Weather): { title: string; curcon: WeatherConditions; weatherDesc: string | undefined } {
  const area = data.nearest_area[0];
  const curcon = data.current_condition[0];

  const title = `${area.areaName[0].value}, ${area.region[0].value}, ${area.country[0].value}`;
  const weatherDesc = curcon ? curcon.weatherDesc[0].value : undefined;
  return { title, curcon, weatherDesc };
}

function WeatherCurrentListItemFragment(props: { data: Weather | undefined }): ReactElement | null {
  const data = props.data;
  if (!data) {
    return null;
  }
  const { title, curcon, weatherDesc } = getMetaData(data);

  const getWind = (): string => {
    const data = curcon as Record<string, any>;
    const key = `windspeed${getWttrWindPostfix()}`;
    let val = "?";
    if (data[key]) {
      val = data[key] || "?";
    }
    return `${val} ${getWindUnit()}`;
  };

  const getTemp = (): string => {
    const key = `temp_${getWttrTemperaturePostfix()}`;
    const f = curcon as Record<string, any>;
    let val = "?";
    if (f[key]) {
      val = f[key];
    }
    return `${val} ${getTemperatureUnit()}`;
  };
  return (
    <React.Fragment>
      <List.Section title={`Weather report (${title})`}>
        <List.Item
          key="_"
          title={getTemp()}
          subtitle={weatherDesc}
          icon={getIcon(curcon.weatherCode)}
          accessories={[
            {
              icon: "💧",
              text: `${curcon.humidity}%`,
            },
            {
              icon: "💨",
              text: `${getWind()} ${getWindDirectionIcon(curcon.winddirDegree)}`,
            },
          ]}
        />
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
      {data?.weather?.map((d, index) => (
        <DayListItem key={d.date} day={d} title={title} />
      ))}
    </List.Section>
  );
}

export function WeatherList() {
  const [query, setQuery] = useState<string>("");
  const { data, error, isLoading } = useSearch(query);
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

function getDefaultQuery(): string | undefined {
  const pref = getPreferenceValues();
  const q = (pref.defaultquery as string) || undefined;
  return q;
}

export function useSearch(query: string | undefined): {
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
