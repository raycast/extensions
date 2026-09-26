import { State } from "@lib/haapi";
import { Color, LaunchType, MenuBarExtra, Toast, launchCommand, showToast } from "@raycast/api";

import { MenuBarSubmenu } from "@components/menu";
import { getErrorMessage, getFriendlyName } from "@lib/utils";
import { ReactElement } from "react";
import { getIcon } from "../state/utils";
import {
  Forecast,
  getHumidityFromState,
  getPressureFromState,
  getTemperatureFromState,
  getWindspeedFromState,
  isDailyForecast,
  weatherConditionToIcon,
  weatherConditionToText,
} from "./utils";

async function launchWeatherCommand() {
  try {
    await launchCommand({ name: "weather", type: LaunchType.UserInitiated });
  } catch (error) {
    showToast({ style: Toast.Style.Failure, title: getErrorMessage(error) || "Internal Error" });
  }
}

export function WeatherWindSpeedMenubarItem(props: { state: State | undefined }): ReactElement | null {
  const s = props.state;
  if (!s) {
    return null;
  }
  const val = getWindspeedFromState(s);
  if (val === undefined) {
    return null;
  }
  return <MenuBarExtra.Item title="Wind Speed" icon="💨" subtitle={val} onAction={launchWeatherCommand} />;
}

export function WeatherWindBearingMenubarItem(props: { state: State | undefined }): ReactElement | null {
  const s = props.state;
  if (!s) {
    return null;
  }
  const val = s.attributes.wind_bearing as number | undefined;
  if (val === undefined) {
    return null;
  }
  return <MenuBarExtra.Item title="Wind Bearing" icon="↗️" subtitle={`${val}`} onAction={launchWeatherCommand} />;
}

export function WeatherPressureMenubarItem(props: { state: State | undefined }): ReactElement | null {
  const s = props.state;
  if (!s) {
    return null;
  }
  const val = getPressureFromState(s);
  if (val === undefined) {
    return null;
  }
  return <MenuBarExtra.Item title="Pressure" icon="📈" subtitle={val} onAction={launchWeatherCommand} />;
}

export function WeatherHumidityMenubarItem(props: { state: State | undefined }): ReactElement | null {
  const s = props.state;
  if (!s) {
    return null;
  }
  const val = getHumidityFromState(s);
  if (val === undefined) {
    return null;
  }
  return <MenuBarExtra.Item title="Humidity" icon="💧" subtitle={val} onAction={launchWeatherCommand} />;
}

export function WeatherTemperatureMenubarItem(props: { state: State | undefined }): ReactElement | null {
  const s = props.state;
  if (!s) {
    return null;
  }
  const val = getTemperatureFromState(s);
  if (val === undefined) {
    return null;
  }
  return (
    <MenuBarExtra.Item
      title="Temperature"
      subtitle={`${val}`}
      icon={{ source: "temperature.png", tintColor: Color.PrimaryText }}
      onAction={launchWeatherCommand}
    />
  );
}

export function WeatherConditionMenubarItem(props: { condition: string | undefined }): ReactElement | null {
  const c = props.condition;
  if (!c) {
    return null;
  }
  const source = weatherConditionToIcon(c);
  return (
    <MenuBarExtra.Item
      title="Condition"
      icon={source}
      subtitle={weatherConditionToText(c)}
      onAction={launchWeatherCommand}
    />
  );
}

export function WeatherForecastMenubarItem(props: {
  forecast: Forecast;
  isDaily: boolean;
  tempUnit: string | undefined;
}): ReactElement {
  const f = props.forecast;
  const ts = new Date(f.datetime);
  const day = ts.toLocaleDateString("default", { day: "numeric" });
  const month = ts.toLocaleDateString("default", { month: "long" });
  const weekday = ts.toLocaleDateString("default", { weekday: "long" });
  const tsString = props.isDaily
    ? `${weekday} ${day}. ${month}`
    : `${weekday} ${ts.toLocaleTimeString("default", { minute: "2-digit", hour: "2-digit" })}`;

  const temp = f.temperature ? Math.round(f.temperature) : undefined;
  const tempText = temp !== undefined ? `⬆${temp} ${props.tempUnit}` : undefined;
  const tempLow = f.templow ? Math.round(f.templow) : undefined;
  const tempLowText = tempLow !== undefined ? `⬇${tempLow} ${props.tempUnit}` : undefined;
  const minmax = [tempText, tempLowText].filter((t) => t !== undefined).join(" ");
  return (
    <MenuBarExtra.Item
      title={tsString}
      icon={{ source: weatherConditionToIcon(f.condition) }}
      tooltip={weatherConditionToText(f.condition)}
      subtitle={minmax}
      onAction={launchWeatherCommand}
    />
  );
}

export function WeatherCurrentMenubarSection(props: { weather: State | undefined }) {
  const weather = props.weather;
  return (
    <MenuBarExtra.Section title="Current">
      <WeatherConditionMenubarItem condition={weather?.state} />
      <WeatherTemperatureMenubarItem state={weather} />
      <WeatherHumidityMenubarItem state={weather} />
      <WeatherPressureMenubarItem state={weather} />
      <WeatherWindSpeedMenubarItem state={weather} />
      <WeatherWindBearingMenubarItem state={weather} />
    </MenuBarExtra.Section>
  );
}

export function WeatherForecastMenubarSection(props: { weather: State | undefined }) {
  const weather = props.weather;
  const forecastAll = weather?.attributes.forecast as Forecast[] | undefined;
  const forecast = forecastAll?.slice(0, 10);
  const isDaily = isDailyForecast(forecast);
  const tempUnit = weather?.attributes.temperature_unit as string | undefined;
  return (
    <MenuBarExtra.Section title="Forecast">
      {forecast?.map((f) => (
        <WeatherForecastMenubarItem key={f.datetime} forecast={f} isDaily={isDaily} tempUnit={tempUnit} />
      ))}
    </MenuBarExtra.Section>
  );
}

export function WeatherMenubarItem(props: { state: State }) {
  const s = props.state;
  return (
    <MenuBarSubmenu title={getFriendlyName(s)} subtitle={s.state} icon={getIcon(s)}>
      <WeatherCurrentMenubarSection weather={s} />
      <WeatherForecastMenubarSection weather={s} />
    </MenuBarSubmenu>
  );
}
