import {
  Color,
  getPreferenceValues,
  Icon,
  Image,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  openCommandPreferences,
} from "@raycast/api";
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
} from "./components/weather";
import { State } from "./haapi";
import { useHAStates } from "./hooks";
import { getErrorMessage, getFriendlyName } from "./utils";

function launchWeatherCommand() {
  launchCommand({ name: "weather", type: LaunchType.UserInitiated });
}

function WeatherMenuBarExtra(props: {
  children: React.ReactNode;
  state: State | undefined;
  isLoading?: boolean;
  title?: string;
  icon?: Image.ImageLike | undefined;
  tooltip?: string;
  error?: string | undefined;
}): JSX.Element {
  const error = props.error;
  return (
    <MenuBarExtra
      title={!error ? props.title : undefined}
      icon={error ? { source: Icon.Cloud, tintColor: Color.Red } : props.icon}
      isLoading={props.isLoading}
      tooltip={error ? `Error: ${error}` : props.tooltip}
    >
      {error ? (
        <>
          <MenuBarExtra.Section>
            <MenuBarExtra.Item title={`Error: ${error}`} />
          </MenuBarExtra.Section>
          <MenuBarExtra.Section>
            <WeatherConfigure />
          </MenuBarExtra.Section>
        </>
      ) : (
        props.children
      )}
    </MenuBarExtra>
  );
}

function WeatherWindSpeed(props: { state: State | undefined }): ReactElement | null {
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

function WeatherWindBearing(props: { state: State | undefined }): ReactElement | null {
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

function WeatherPressure(props: { state: State | undefined }): ReactElement | null {
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

function WeatherHumidity(props: { state: State | undefined }): ReactElement | null {
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

function WeatherTemperature(props: { state: State | undefined }): ReactElement | null {
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

function WeatherCondition(props: { condition: string | undefined }): ReactElement | null {
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

function WeatherConfigure(): ReactElement {
  return (
    <MenuBarExtra.Item
      title="Configure"
      icon={Icon.Gear}
      shortcut={{ modifiers: ["cmd"], key: "," }}
      onAction={openCommandPreferences}
    />
  );
}

function WeatherForecastItem(props: {
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

function getWeatherEntityPreference(): string {
  const prefs = getPreferenceValues();
  const entity = prefs.entity as string | undefined;
  if (entity && entity.trim().length > 0) {
    return entity.trim();
  }
  return "weather.home";
}

export default function WeatherMenuBarCommand(): JSX.Element {
  const { states, error: stateError, isLoading } = useHAStates();
  const entity = getWeatherEntityPreference();
  const weatherStates = states?.filter((s) => s.entity_id === entity);
  const weather = weatherStates && weatherStates.length > 0 ? weatherStates[0] : undefined;
  const temp = getTemperatureFromState(weather);
  const forecastAll = weather?.attributes.forecast as Forecast[] | undefined;
  const forecast = forecastAll?.slice(0, 10);
  const isDaily = isDailyForecast(forecast);
  const tempUnit = weather?.attributes.temperature_unit as string | undefined;
  const error = stateError
    ? getErrorMessage(stateError)
    : weather === undefined
    ? `Entity '${entity}' not found`
    : undefined;
  return (
    <WeatherMenuBarExtra
      title={temp ? temp.toString() : undefined}
      tooltip={weather?.state ? weatherConditionToText(weather.state) : undefined}
      isLoading={isLoading}
      error={error}
      state={weather}
      icon={weather?.state ? weatherConditionToIcon(weather.state) : undefined}
    >
      <MenuBarExtra.Section title="Entity">
        <MenuBarExtra.Item
          icon={{ source: "entity.png", tintColor: Color.SecondaryText }}
          title={weather ? getFriendlyName(weather) : ""}
          onAction={openCommandPreferences}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Current">
        <WeatherCondition condition={weather?.state} />
        <WeatherTemperature state={weather} />
        <WeatherHumidity state={weather} />
        <WeatherPressure state={weather} />
        <WeatherWindSpeed state={weather} />
        <WeatherWindBearing state={weather} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Forecast">
        {forecast?.map((f) => (
          <WeatherForecastItem key={f.datetime} forecast={f} isDaily={isDaily} tempUnit={tempUnit} />
        ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <WeatherConfigure />
      </MenuBarExtra.Section>
    </WeatherMenuBarExtra>
  );
}
