import { State } from "@lib/haapi";
import { Action, Color, List } from "@raycast/api";
import { ReactElement } from "react";
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

function WeatherTemperature(props: { state: State }): ReactElement | null {
  const s = props.state;
  const val = getTemperatureFromState(s);
  if (val === undefined) {
    return null;
  }
  return (
    <List.Item
      title="Temperature"
      icon={{ source: "temperature.png", tintColor: Color.PrimaryText }}
      accessories={[{ text: `${val}` }]}
    />
  );
}

function WeatherHumidity(props: { state: State }): ReactElement | null {
  const s = props.state;
  const val = getHumidityFromState(s);
  if (val === undefined) {
    return null;
  }
  return <List.Item title="Humidity" icon="💧" accessories={[{ text: `${val}` }]} />;
}

function WeatherPressure(props: { state: State }): ReactElement | null {
  const s = props.state;
  const val = getPressureFromState(s);
  if (val === undefined) {
    return null;
  }
  return <List.Item title="Pressure" icon="📈" accessories={[{ text: `${val}` }]} />;
}

function WeatherWindBearing(props: { state: State }): ReactElement | null {
  const s = props.state;
  const val = s.attributes.wind_bearing as number | undefined;
  if (val === undefined) {
    return null;
  }
  return <List.Item title="Wind Bearing" icon="↗️" accessories={[{ text: `${val}` }]} />;
}

function WeatherWindSpeed(props: { state: State }): ReactElement | null {
  const s = props.state;
  const val = getWindspeedFromState(s);
  if (val === undefined) {
    return null;
  }
  return <List.Item title="Wind Speed" icon="💨" accessories={[{ text: `${val}` }]} />;
}

function WeatherCondition(props: { condition: string }): ReactElement | null {
  const c = props.condition;
  const source = weatherConditionToIcon(c);
  return <List.Item title="Condition" icon={source} accessories={[{ text: `${c}` }]} />;
}

function WeatherForecastItem(props: { forecast: Forecast; isDaily: boolean; tempUnit?: string }): ReactElement {
  const f = props.forecast;
  const tostr = (val: number | undefined, param?: { prefix?: string; suffix?: string }): string | undefined => {
    if (val === undefined) {
      return undefined;
    }
    return [param?.prefix, val.toString(), param?.suffix].filter((t) => t !== undefined).join("");
  };
  const ts = new Date(f.datetime);
  const day = ts.toLocaleDateString("default", { day: "numeric" });
  const month = ts.toLocaleDateString("default", { month: "long" });
  const weekday = ts.toLocaleDateString("default", { weekday: "long" });
  const tsString = props.isDaily
    ? `${weekday} ${day}. ${month}`
    : `${weekday} ${ts.toLocaleTimeString("default", { minute: "2-digit", hour: "2-digit" })}`;
  return (
    <List.Item
      title={tsString}
      icon={{ source: weatherConditionToIcon(f.condition), tooltip: weatherConditionToText(f.condition) }}
      accessories={[
        { text: tostr(f.temperature, { prefix: "⬆ ", suffix: props.tempUnit }), tooltip: "max" },
        { text: tostr(f.templow, { prefix: "⬇ ", suffix: props.tempUnit }), tooltip: "min" },
      ]}
    />
  );
}

function WeatherList(props: { state: State }): ReactElement {
  const s = props.state;
  const forecast = s.attributes.forecast as Forecast[] | undefined;
  const isDaily = isDailyForecast(forecast);
  const tempUnit = s.attributes.temperature_unit as string | undefined;
  return (
    <List>
      <List.Section title="Current">
        <WeatherCondition condition={s.state} />
        <WeatherTemperature state={s} />
        <WeatherHumidity state={s} />
        <WeatherPressure state={s} />
        <WeatherWindBearing state={s} />
        <WeatherWindSpeed state={s} />
      </List.Section>
      <List.Section title="Forecast">
        {forecast?.map((f) => <WeatherForecastItem forecast={f} isDaily={isDaily} tempUnit={tempUnit} />)}
      </List.Section>
    </List>
  );
}

export function ShowWeatherAction(props: { state: State }): ReactElement {
  return <Action.Push title="Show Weather" target={<WeatherList state={props.state} />} />;
}
