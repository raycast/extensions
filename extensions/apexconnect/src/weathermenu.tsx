import { useHAStates } from "@components/hooks";
import { MenuBarItemConfigureCommand } from "@components/menu";
import { PrimaryIconColor } from "@components/state/utils";
import { WeatherCurrentMenubarSection, WeatherForecastMenubarSection } from "@components/weather/menu";
import { getTemperatureFromState, weatherConditionToIcon, weatherConditionToText } from "@components/weather/utils";
import { State } from "@lib/haapi";
import { getErrorMessage, getFriendlyName } from "@lib/utils";
import { Color, getPreferenceValues, Icon, Image, MenuBarExtra, openCommandPreferences } from "@raycast/api";

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
            <MenuBarItemConfigureCommand />
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
  const { states, error: stateError, isLoading } = useHAStates();
  const entity = getWeatherEntityPreference();
  const weatherStates = states?.filter((s) => s.entity_id === entity);
  const weather = weatherStates && weatherStates.length > 0 ? weatherStates[0] : undefined;
  const temp = getTemperatureFromState(weather);
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
          icon={{ source: "entity.png", tintColor: PrimaryIconColor }}
          title={weather ? getFriendlyName(weather) : ""}
          onAction={openCommandPreferences}
        />
      </MenuBarExtra.Section>
      <WeatherCurrentMenubarSection weather={weather} />
      <WeatherForecastMenubarSection weather={weather} />
      <MenuBarExtra.Section>
        <MenuBarItemConfigureCommand />
      </MenuBarExtra.Section>
    </WeatherMenuBarExtra>
  );
}
