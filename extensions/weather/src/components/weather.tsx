import { ActionPanel, Color, getPreferenceValues, Icon, List, PushAction, showToast, ToastStyle } from "@raycast/api";
import moment from "moment";
import { useEffect, useState } from "react";
import { getIcon, getWindDirectionIcon } from "../icons";
import { getTemperatureUnit, getWindUnit, getWttrTemperaturePostfix, getWttrWindPostfix } from "../unit";
import { Weather, WeatherData, wttr } from "../wttr";
import { DayList } from "./day";

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
  return (
    <List.Item
      key={data.date}
      title={wd}
      subtitle={`max: ${getTemp("max")}, min: ${getTemp("min")}`}
      icon={{ source: Icon.Calendar, tintColor: Color.PrimaryText }}
      actions={
        <ActionPanel>
          <PushAction title="Show Details" target={<DayList day={data} title={`${props.title} - ${wd}`} />} />
        </ActionPanel>
      }
    />
  );
}

function getWeekday(date: string): string {
  const d = moment(date);
  return d.locale("en").format("dddd");
}

export function WeatherList() {
  const [query, setQuery] = useState<string>("");
  const { data, error, isLoading } = useSearch(query);
  if (error) {
    showToast(ToastStyle.Failure, "Cannot search weather", error);
  }
  if (!data) {
    return <List isLoading={true} searchBarPlaceholder="Loading" />;
  }

  const area = data.nearest_area[0];
  const curcon = data.current_condition[0];

  const title = `${area.areaName[0].value}, ${area.region[0].value}, ${area.country[0].value}`;

  const weatherDesc = curcon.weatherDesc[0].value;

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
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search for other location (e.g. London)"
      onSearchTextChange={setQuery}
      throttle={true}
    >
      <List.Section title={`Weather report (${title})`}>
        <List.Item
          key="_"
          title={getTemp()}
          subtitle={weatherDesc}
          icon={getIcon(curcon.weatherCode)}
          accessoryTitle={`humidity: ${curcon.humidity}% | wind ${getWind()} ${getWindDirectionIcon(
            curcon.winddirDegree
          )}`}
        />
      </List.Section>
      <List.Section title="Daily Forecast">
        {data.weather?.map((data, index) => (
          <DayListItem key={data.date} day={data} title={title} />
        ))}
      </List.Section>
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
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
          setError(e.message);
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
