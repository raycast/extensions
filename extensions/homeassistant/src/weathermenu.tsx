import { useHAStates } from "@components/hooks";
import { PrimaryIconColor } from "@components/state/utils";
import { useWeatherForecast } from "@components/weather/hooks";
import {
  launchWeatherCommand,
  WeatherCurrentMenubarSection,
  WeatherForecastMenubarSection,
} from "@components/weather/menu";
import { getTemperatureFromState, weatherConditionToIcon, weatherConditionToText } from "@components/weather/utils";
import { State } from "@lib/haapi";
import { formatToHumanDateTime, getErrorMessage, getFriendlyName } from "@lib/utils";
import { Color, getPreferenceValues, Icon, Image, MenuBarExtra, openCommandPreferences } from "@raycast/api";
import { MenuBarExtra as RUIMenuBarExtra } from "@raycast-community/ui";
import { SunMenubarSection } from "@components/sun/menu";

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
            <RUIMenuBarExtra.ConfigureCommand />
          </MenuBarExtra.Section>
        </>
      ) : (
        props.children
      )}
    </MenuBarExtra>
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
  const { states, error: stateError, isLoading: statesLoading } = useHAStates();
  const entity = getWeatherEntityPreference();
  const weatherStates = states?.filter((s) => s.entity_id === entity);
  const weather = weatherStates && weatherStates.length > 0 ? weatherStates[0] : undefined;
  const temp = getTemperatureFromState(weather);
  const error = stateError
    ? getErrorMessage(stateError)
    : weather === undefined
      ? `Entity '${entity}' not found`
      : undefined;

  const sunState = states?.filter((s) => s.entity_id === "sun.sun")[0];
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
      <WeatherCurrentMenubarSection weather={weather} />
      <WeatherForecastMenubarSection weather={weather} forecast={forecast} />
      <SunMenubarSection sun={sunState} />
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={{ source: "entity.png", tintColor: PrimaryIconColor }}
          title="Source"
          subtitle={weather ? getFriendlyName(weather) : ""}
          onAction={openCommandPreferences}
        />
        <MenuBarExtra.Item
          title="Fetched"
          subtitle={formatToHumanDateTime(new Date())}
          icon={Icon.Clock}
          onAction={launchWeatherCommand}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <RUIMenuBarExtra.ConfigureCommand />
      </MenuBarExtra.Section>
    </WeatherMenuBarExtra>
  );
}
