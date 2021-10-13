import { ActionPanel, List, PushAction, showToast, ToastStyle } from "@raycast/api";
import moment from "moment";
import { useEffect, useState } from "react";
import { getIcon, getWindDirectionIcon } from "../icons";
import { Weather, WeatherData, wttr } from "../wttr";
import { DayList } from "./day";

export function DayListItem(props: { day: WeatherData; title: string }) {
  const data = props.day;
  const wd = getWeekday(data.date);
  return (
    <List.Item
      key={data.date}
      title={wd}
      subtitle={`max: ${data.maxtempC} °C, min: ${data.mintempC} °C`}
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
  return d.format("dddd");
}

export function WeatherList(props: {}) {
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

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search for other location (e.g. London)"
      onSearchTextChange={setQuery}
      throttle={true}
    >
      <List.Section title={`Current (${title})`}>
        <List.Item
          key="_"
          title={`${curcon.temp_C}°C`}
          subtitle={curcon.weatherDesc[0].value}
          icon={getIcon(curcon.weatherCode)}
          accessoryTitle={`humidity: ${curcon.humidity}% | wind: ${curcon.windspeedKmph} km/h ${getWindDirectionIcon(
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
