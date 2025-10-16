import { State } from "@lib/haapi";
import { MenuBarExtra as RUIMenuBarExtra } from "@raycast-community/ui";
import { Color, launchCommand, LaunchType, MenuBarExtra, showToast, Toast } from "@raycast/api";

import { LastUpdateChangeMenubarItem, MenuBarSubmenu } from "@components/menu";
import { getErrorMessage, getFriendlyName } from "@lib/utils";
import { getIcon } from "../state/utils";
import { useWeatherForecast } from "./hooks";
import {
  Forecast,
  getHumidityFromState,
  getPressureFromState,
  getTemperatureFromState,
  getWindspeedFromState,
  weatherConditionToIcon,
  weatherConditionToText,
  WeatherForecastType,
} from "./utils";

export async function launchWeatherCommand() {
  try {
    await launchCommand({ name: "weather", type: LaunchType.UserInitiated });
  } catch (error) {
    showToast({ style: Toast.Style.Failure, title: getErrorMessage(error) || "Internal Error" });
  }
}

export function WeatherWindSpeedMenubarItem({ state: s }: { state: State | undefined }) {
  if (!s) {
    return null;
  }
  const val = getWindspeedFromState(s);
  if (val === undefined) {
    return null;
  }
  return <MenuBarExtra.Item title="Wind Speed" icon="💨" subtitle={val} onAction={launchWeatherCommand} />;
}

export function WeatherWindBearingMenubarItem({ state: s }: { state: State | undefined }) {
  if (!s) {
    return null;
  }
  const val = s.attributes.wind_bearing as number | undefined;
  if (val === undefined) {
    return null;
  }
  return <MenuBarExtra.Item title="Wind Bearing" icon="↗️" subtitle={`${val}`} onAction={launchWeatherCommand} />;
}

export function WeatherPressureMenubarItem({ state: s }: { state: State | undefined }) {
  if (!s) {
    return null;
  }
  const val = getPressureFromState(s);
  if (val === undefined) {
    return null;
  }
  return <MenuBarExtra.Item title="Pressure" icon="📈" subtitle={val} onAction={launchWeatherCommand} />;
}

export function WeatherHumidityMenubarItem({ state: s }: { state: State | undefined }) {
  if (!s) {
    return null;
  }
  const val = getHumidityFromState(s);
  if (val === undefined) {
    return null;
  }
  return <MenuBarExtra.Item title="Humidity" icon="💧" subtitle={val} onAction={launchWeatherCommand} />;
}

export function WeatherTemperatureMenubarItem({ state: s }: { state: State | undefined }) {
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
      icon={{ source: "thermometer.svg", tintColor: Color.PrimaryText }}
      onAction={launchWeatherCommand}
    />
  );
}

export function WeatherConditionMenubarItem({ condition: c }: { condition: string | undefined }) {
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
}) {
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

export function WeatherCurrentMenubarSection(props: {
  weather: State | undefined;
  temperature?: State;
  humidity?: State;
}) {
  const weather = props.weather;
  return (
    <MenuBarExtra.Section title="Current">
      <WeatherConditionMenubarItem condition={weather?.state} />
      <WeatherTemperatureMenubarItem state={props.temperature ?? weather} />
      <WeatherHumidityMenubarItem state={props.humidity ?? weather} />
      <WeatherPressureMenubarItem state={weather} />
      <WeatherWindSpeedMenubarItem state={weather} />
      <WeatherWindBearingMenubarItem state={weather} />
    </MenuBarExtra.Section>
  );
}

export function WeatherForecastMenubarSection(props: {
  weather: State | undefined;
  forecast?: Forecast[] | null;
  maxDailyChildren?: number;
  maxHourlyChildren?: number;
}) {
  const weather = props.weather;
  if (!weather) {
    return null;
  }
  const { data: daily } = useWeatherForecast(weather.entity_id, {
    data: props.forecast,
    type: WeatherForecastType.Daily,
  });

  const { data: hourly } = useWeatherForecast(weather.entity_id, { type: WeatherForecastType.Hourly });
  const tempUnit = weather?.attributes.temperature_unit as string | undefined;
  const validMaxChildrenValue = (value: number | undefined) => {
    if (value !== undefined && value <= 0) {
      return false;
    }
    return true;
  };
  return (
    <>
      {validMaxChildrenValue(props.maxHourlyChildren) && (
        <RUIMenuBarExtra.Section title="Forecast (Hourly)" childrenLimit={{ max: props.maxHourlyChildren ?? 5 }}>
          {hourly?.map((f) => (
            <WeatherForecastMenubarItem key={f.datetime} forecast={f} isDaily={false} tempUnit={tempUnit} />
          ))}
        </RUIMenuBarExtra.Section>
      )}
      {validMaxChildrenValue(props.maxDailyChildren) && (
        <RUIMenuBarExtra.Section title="Forecast (Daily)" childrenLimit={{ max: props.maxDailyChildren ?? 10 }}>
          {daily?.map((f) => (
            <WeatherForecastMenubarItem key={f.datetime} forecast={f} isDaily={true} tempUnit={tempUnit} />
          ))}
        </RUIMenuBarExtra.Section>
      )}
    </>
  );
}

export function WeatherMenubarItem({ state: s }: { state: State }) {
  return (
    <MenuBarSubmenu title={getFriendlyName(s)} subtitle={s.state} icon={getIcon(s)}>
      <WeatherCurrentMenubarSection weather={s} />
      <WeatherForecastMenubarSection weather={s} />
      <MenuBarExtra.Section>
        <LastUpdateChangeMenubarItem state={s} />
        <RUIMenuBarExtra.CopyToClipboard title="Copy Entity ID" content={s.entity_id} tooltip={s.entity_id} />
      </MenuBarExtra.Section>
    </MenuBarSubmenu>
  );
}
