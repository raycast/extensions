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

interface Forecast {
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

function WeatherTemperature(props: { state: State }): ReactElement | null {
  const s = props.state;
  const val = s.attributes.temperature as number | undefined;
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
  const val = s.attributes.humidity as number | undefined;
  if (val === undefined) {
    return null;
  }
  return <List.Item title="Humidity" icon="💧" accessories={[{ text: `${val}` }]} />;
}

function WeatherPressure(props: { state: State }): ReactElement | null {
  const s = props.state;
  const val = s.attributes.pressure as number | undefined;
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
  const val = s.attributes.wind_speed as number | undefined;
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

function WeatherForecastItem(props: { forecast: Forecast; isDaily: boolean }): ReactElement {
  const f = props.forecast;
  const tostr = (val: number | undefined): string | undefined => {
    if (val === undefined) {
      return undefined;
    }
    return val.toString();
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
      icon={{ source: weatherConditionToIcon(f.condition), tooltip: f.condition }}
      accessories={[
        { text: tostr(f.templow), tooltip: "min" },
        { text: tostr(f.temperature), tooltip: "max" },
      ]}
    />
  );
}

function isDailyForecast(forecast: Forecast[] | undefined): boolean {
  if (forecast && forecast.length > 1) {
    const t1 = new Date(forecast[0].datetime);
    const t2 = new Date(forecast[1].datetime);
    const delta = t2.getDate() - t1.getDate();
    if (delta === 1) {
      return true;
    }
    //console.log(delta);
  }
  return false;
}

function WeatherList(props: { state: State }): ReactElement {
  const s = props.state;
  const forecast = s.attributes.forecast as Forecast[] | undefined;
  const isDaily = isDailyForecast(forecast);
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
          <WeatherForecastItem forecast={f} isDaily={isDaily} />
        ))}
      </List.Section>
    </List>
  );
}

export function ShowWeatherAction(props: { state: State }): ReactElement {
  return <Action.Push title="Show Weather" target={<WeatherList state={props.state} />} />;
}
