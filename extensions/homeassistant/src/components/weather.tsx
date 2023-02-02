import { Action, Color, List } from "@raycast/api";
import { ReactElement } from "react";
import { State } from "../haapi";

export const weatherStatusToIcon: Record<string, string> = {
  "clear-night": "",
  cloudy: "☁️",
  exceptional: "",
  fog: "🌫",
  hail: "☀️",
  lightning: "🌩",
  partlycloudy: "☁️",
  pouring: "🌧",
  rainy: "🌨",
  snowy: "❄️",
  "snowy-rainy": "❄️",
  sunny: "☀️",
  windy: "💨",
  "windy-variant": "💨",
};

const weatherStatusToText: Record<string, string> = {
  "clear-night": "Clear Night",
  cloudy: "Cloudy",
  exceptional: "Exceptional",
  fog: "Fog",
  hail: "Hail",
  lightning: "Lightning",
  partlycloudy: "Partly Cloudy",
  pouring: "Pouring",
  rainy: "Rainy",
  snowy: "Snowy",
  "snowy-rainy": "Snowy-Rainy",
  sunny: "Sunny",
  windy: "Windy",
  "windy-variant": "Windy Variant",
};

export interface Forecast {
  condition: string;
  temperature?: number;
  templow?: number;
  datetime: string;
  wind_bearing?: number;
  wind_speed?: number;
}

export function weatherConditionToIcon(condition: string): string {
  return weatherStatusToIcon[condition] || "✨";
}

export function weatherConditionToText(condition: string): string {
  return weatherStatusToText[condition] || "❓";
}

export function getTemperatureFromState(state: State | undefined): string | undefined {
  if (!state) {
    return undefined;
  }
  const temp = state.attributes.temperature as number | undefined;
  if (temp !== undefined) {
    const unit = state.attributes.temperature_unit as string | undefined;
    const result = unit !== undefined ? `${temp} ${unit}` : `${temp}`;
    return result;
  }
}

export function getWindspeedFromState(state: State | undefined): string | undefined {
  if (!state) {
    return undefined;
  }
  const wind_speed = state.attributes.wind_speed as number | undefined;
  if (wind_speed !== undefined) {
    const unit = state.attributes.wind_speed_unit as string | undefined;
    const result = unit !== undefined ? `${wind_speed} ${unit}` : `${wind_speed}`;
    return result;
  }
}

export function getPressureFromState(state: State | undefined): string | undefined {
  if (!state) {
    return undefined;
  }
  const pressure = state.attributes.pressure as number | undefined;
  if (pressure !== undefined) {
    const unit = state.attributes.pressure_unit as string | undefined;
    const result = unit !== undefined ? `${pressure} ${unit}` : `${pressure}`;
    return result;
  }
}

export function getHumidityFromState(state: State | undefined): string | undefined {
  if (!state) {
    return undefined;
  }
  const humidity = state.attributes.humidity as number | undefined;
  if (humidity !== undefined) {
    return `${humidity}%`;
  }
}

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

export function isDailyForecast(forecast: Forecast[] | undefined): boolean {
  if (forecast && forecast.length > 1) {
    const t1 = new Date(forecast[0].datetime);
    const t2 = new Date(forecast[1].datetime);
    const delta = t2.getDate() - t1.getDate();
    if (delta === 1) {
      return true;
    }
  }
  return false;
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
        {forecast?.map((f) => (
          <WeatherForecastItem forecast={f} isDaily={isDaily} tempUnit={tempUnit} />
        ))}
      </List.Section>
    </List>
  );
}

export function ShowWeatherAction(props: { state: State }): ReactElement {
  return <Action.Push title="Show Weather" target={<WeatherList state={props.state} />} />;
}
