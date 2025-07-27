import { useHAStates } from "@components/hooks";
import { LastUpdateChangeMenubarItem } from "@components/menu";
import { PrimaryIconColor } from "@components/state/utils";
import { SunMenubarSection } from "@components/sun/menu";
import { useWeatherForecast } from "@components/weather/hooks";
import {
  launchWeatherCommand,
  WeatherCurrentMenubarSection,
  WeatherForecastMenubarSection,
} from "@components/weather/menu";
import { getTemperatureFromState, weatherConditionToIcon, weatherConditionToText } from "@components/weather/utils";
import { State } from "@lib/haapi";
import { getErrorMessage, getFriendlyName } from "@lib/utils";
import { MenuBarExtra as RUIMenuBarExtra } from "@raycast-community/ui";
import { Color, getPreferenceValues, Icon, Image, MenuBarExtra, openCommandPreferences } from "@raycast/api";

function WeatherMenuBarExtra(props: {
  children: React.ReactNode;
  state: State | undefined;
  isLoading?: boolean;
  title?: string;
  icon?: Image.ImageLike | undefined;
  tooltip?: string;
  error?: string | undefined;
}) {
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
            <RUIMenuBarExtra.ConfigureCommand />
          </MenuBarExtra.Section>
        </>
      ) : (
        <>{props.children}</>
      )}
    </MenuBarExtra>
  );
}

function getWeatherEntityPreference() {
  const prefs = getPreferenceValues();
  const entity = prefs.entity as string | undefined;
  if (entity && entity.trim().length > 0) {
    return entity.trim();
  }
  return "weather.home";
}

function stringToNumber(text: string | undefined | null, options: { fallback?: number; min?: number; max?: number }) {
  if (text === undefined || text === null) {
    return options.fallback;
  }
  const result = parseFloat(text);
  if (Number.isNaN(result)) {
    return options.fallback;
  }
  if (options.min !== undefined && result < options.min) {
    return options.fallback;
  }
  if (options.max !== undefined && result > options.max) {
    return options.fallback;
  }
  return result;
}

function getMaxHourlyForecastItemsPreference() {
  const prefs = getPreferenceValues<Preferences.Weathermenu>();
  return stringToNumber(prefs.maxHourlyForecastItems, { fallback: 5, min: 0, max: 100 });
}

function getMaxDailyForecastItemsPreference() {
  const prefs = getPreferenceValues<Preferences.Weathermenu>();
  return stringToNumber(prefs.maxDailyForecastItems, { fallback: 10, min: 0, max: 100 });
}

function getTemperatureEntityPreference() {
  const prefs = getPreferenceValues<Preferences.Weathermenu>();
  return prefs.temperatureEntity?.trim();
}

function getHumidityEntityPreference() {
  const prefs = getPreferenceValues<Preferences.Weathermenu>();
  return prefs.humidityEntity?.trim();
}

export default function WeatherMenuBarCommand() {
  const { states, error: stateError, isLoading: statesLoading } = useHAStates();
  const entity = getWeatherEntityPreference();
  const weatherStates = states?.filter((s) => s.entity_id === entity);
  const weather = weatherStates && weatherStates.length > 0 ? weatherStates[0] : undefined;
  const temperatureSensorID = getTemperatureEntityPreference();
  const temperatureState = states?.filter(
    (s) => s.entity_id === temperatureSensorID && s.attributes.device_class === "temperature",
  )[0];
  const temp = getTemperatureFromState(temperatureState ?? weather);
  const error = stateError
    ? getErrorMessage(stateError)
    : weather === undefined
      ? `Entity '${entity}' not found`
      : undefined;

  const sunState = states?.filter((s) => s.entity_id === "sun.sun")[0];
  const humidityState = states?.filter(
    (s) =>
      s.entity_id === getHumidityEntityPreference() &&
      (s.attributes.device_class === "humidity" || s.entity_id.startsWith("weather.")),
  )[0];
  const { data: forecast, isLoading: forecastLoading } = useWeatherForecast(weather?.entity_id);
  const isLoading = statesLoading || forecastLoading;
  return (
    <WeatherMenuBarExtra
      title={temp ? temp.toString() : undefined}
      tooltip={weather?.state ? weatherConditionToText(weather.state) : undefined}
      isLoading={isLoading}
      error={error}
      state={weather}
      icon={weather?.state ? weatherConditionToIcon(weather.state) : undefined}
    >
      <WeatherCurrentMenubarSection weather={weather} temperature={temperatureState} humidity={humidityState} />
      <WeatherForecastMenubarSection
        weather={weather}
        forecast={forecast}
        maxDailyChildren={getMaxDailyForecastItemsPreference()}
        maxHourlyChildren={getMaxHourlyForecastItemsPreference()}
      />
      <SunMenubarSection sun={sunState} />
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={{ source: "shape.svg", tintColor: PrimaryIconColor }}
          title="Source"
          subtitle={weather ? getFriendlyName(weather) : ""}
          onAction={openCommandPreferences}
        />
        {weather && <LastUpdateChangeMenubarItem state={weather} onAction={launchWeatherCommand} />}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <RUIMenuBarExtra.ConfigureCommand />
      </MenuBarExtra.Section>
    </WeatherMenuBarExtra>
  );
}
