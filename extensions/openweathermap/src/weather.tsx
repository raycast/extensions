import { List } from "@raycast/api";
import React, { ReactElement, useState } from "react";
import {
  Daily,
  getDailyForecastCountPreference,
  getDefaultQuery,
  getHourlyForecastCountPreference,
  getIconURL,
  Hourly,
  useWeather,
  Weather,
} from "./lib/openweathermap";
import { getTemperatureUnit, getWindUnit } from "./lib/unit";
import { getDay, getHour, getMonth, getWeekday, unixTimestampToDate } from "./lib/utils";

function CurrentWeatherFragment(props: { weather: Weather | undefined }): ReactElement | null {
  const w = props.weather;
  if (!w) {
    return null;
  }
  const c = w.current;
  return (
    <List.Section title="Current">
      <List.Item
        title={`${Math.round(w.current.temp)} ${getTemperatureUnit()}`}
        subtitle={w.current.weather[0].description}
        icon={getIconURL(w.current.weather[0].icon)}
        accessories={[
          { text: `${Math.round(c.humidity)} %`, icon: "💧", tooltip: `Humidity ${c.humidity}` },
          { text: `${Math.round(c.wind_speed)} ${getWindUnit()}`, icon: "💨", tooltip: `Wind ${c.wind_speed}` },
        ]}
      />
    </List.Section>
  );
}

function WeatherList(props: {
  children: ReactElement;
  throttle?: boolean | undefined;
  onSearchTextChange?: ((text: string) => void) | undefined;
  searchBarPlaceholder?: string | undefined;
  isLoading?: boolean | undefined;
  error?: string | undefined;
}): ReactElement {
  const error = props.error;
  return (
    <List
      throttle={props.throttle}
      isLoading={props.isLoading}
      onSearchTextChange={props.onSearchTextChange}
      searchBarPlaceholder={props.searchBarPlaceholder}
    >
      {error ? (
        <List.EmptyView title="Could not fetch data from OpenWeatherMap" icon="⛈️" description={error} />
      ) : (
        <React.Fragment>{props.children}</React.Fragment>
      )}
    </List>
  );
}

function ForecastDailyListItem(props: { daily: Daily }): ReactElement {
  const daily = props.daily;
  const d = unixTimestampToDate(daily.dt);
  const title = `${getWeekday(d)} ${getDay(d)}. ${getMonth(d)}`;
  return (
    <List.Item
      title={title}
      subtitle={daily.weather[0].description}
      icon={getIconURL(daily.weather[0].icon)}
      accessories={[
        { text: `${Math.round(daily.humidity)} %`, icon: "💧", tooltip: `Humidity ${daily.humidity}` },
        { text: `${Math.round(daily.wind_speed)} ${getWindUnit()}`, icon: "💨", tooltip: `Wind ${daily.wind_speed}` },
        { text: `${Math.round(daily.temp.min)}`, tooltip: `min ${daily.temp.min}`, icon: "⬇️" },
        { text: `${Math.round(daily.temp.max)}`, tooltip: `max ${daily.temp.max}`, icon: "⬆️" },
      ]}
    />
  );
}

function ForecastHourlyListItem(props: { hourly: Hourly }): ReactElement {
  const hourly = props.hourly;
  const d = unixTimestampToDate(hourly.dt);
  const title = `${getHour(d)}`;
  return (
    <List.Item
      title={title}
      subtitle={hourly.weather[0].description}
      icon={getIconURL(hourly.weather[0].icon)}
      accessories={[
        { text: `${Math.round(hourly.humidity)} %`, icon: "💧", tooltip: `Humidity ${hourly.humidity}` },
        { text: `${Math.round(hourly.wind_speed)} ${getWindUnit()}`, icon: "💨", tooltip: `Wind ${hourly.wind_speed}` },
      ]}
    />
  );
}

export default function Root(): ReactElement {
  const [query, setQuery] = useState<string>(getDefaultQuery());
  const { weather, isLoading, error } = useWeather(query);
  const now = new Date();
  const futureHourly = weather?.hourly?.filter((h) => unixTimestampToDate(h.dt) > now);
  const hourly = futureHourly?.slice(0, getHourlyForecastCountPreference());
  const daily = weather?.daily?.slice(0, getDailyForecastCountPreference());
  return (
    <WeatherList
      throttle
      onSearchTextChange={setQuery}
      isLoading={isLoading}
      searchBarPlaceholder="Search for other location (e.g. London)"
      error={error}
    >
      {query === undefined || query.length === 0 ? (
        <List.EmptyView title="You can define a default query in the preferences" icon="☀️" />
      ) : (
        <React.Fragment>
          <CurrentWeatherFragment weather={weather} />
          <List.Section title="Hourly Forecast">
            {hourly?.map((h) => (
              <ForecastHourlyListItem hourly={h} />
            ))}
          </List.Section>
          <List.Section title="Daily Forecast">
            {daily?.map((d) => (
              <ForecastDailyListItem daily={d} />
            ))}
          </List.Section>
        </React.Fragment>
      )}
    </WeatherList>
  );
}
