import {
  getPreferenceValues,
  Icon,
  Image,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  open,
  openCommandPreferences,
} from "@raycast/api";
import {
  getCurrentTemperature,
  getCurrentWind,
  getMetaData,
  useWeather,
  getDefaultQuery,
  getDayWeatherIcon,
  getWeekday,
  getDayTemperature,
} from "./components/weather";
import { getWeatherCodeIcon, getWindDirectionIcon, WeatherIcons } from "./icons";
import {
  getCurrentFeelLikeTemperature,
  getCurrentHumidity,
  getCurrentUVIndex,
  Weather,
  WeatherConditions,
} from "./wttr";

function launchWeatherCommand() {
  launchCommand({ name: "index", type: LaunchType.UserInitiated });
}

function getAppearancePreferences(): { showMenuIcon: boolean; showMenuText: boolean } {
  const prefs = getPreferenceValues();
  const showMenuText = prefs.showmenutext as boolean | true;
  const showMenuIcon = prefs.showmenuicon as boolean | true;
  return {
    showMenuIcon,
    showMenuText,
  };
}

function getWeatherMenuIcon(curcon: WeatherConditions | undefined): Image.ImageLike | undefined {
  const { showMenuIcon, showMenuText } = getAppearancePreferences();
  if (!showMenuIcon && !showMenuText) {
    return Icon.Cloud;
  }
  if (!showMenuIcon) {
    return undefined;
  }
  return curcon ? getWeatherCodeIcon(curcon.weatherCode) : "weather.png";
}

function FeelsLikeMenuItem(props: { curcon: WeatherConditions | undefined }) {
  const feelsLike = getCurrentFeelLikeTemperature(props.curcon);
  if (!feelsLike) {
    return null;
  }
  return (
    <MenuBarExtra.Item
      title="Feels Like"
      subtitle={feelsLike.valueAndUnit}
      icon={WeatherIcons.FeelsLike}
      onAction={() => {
        /**/
      }}
    />
  );
}

function UVIndexMenuItem(props: { curcon: WeatherConditions | undefined }) {
  const uvIndex = getCurrentUVIndex(props.curcon);
  if (!uvIndex) {
    return null;
  }
  return (
    <MenuBarExtra.Item
      title="UV Index"
      subtitle={uvIndex}
      icon={WeatherIcons.UVIndex}
      onAction={() => {
        /**/
      }}
    />
  );
}

function HumidityMenuItem(props: { curcon: WeatherConditions | undefined }) {
  const hum = getCurrentHumidity(props.curcon);
  if (!hum) {
    return null;
  }
  return (
    <MenuBarExtra.Item
      title="Humidity"
      subtitle={hum.valueAndUnit}
      icon={WeatherIcons.Humidity}
      onAction={() => {
        /**/
      }}
    />
  );
}

function WeatherMenuBarExtra(props: {
  children: React.ReactNode;
  data: Weather | undefined;
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
      icon={error ? Icon.Cloud : props.icon}
      isLoading={props.isLoading}
      tooltip={error ? `Error: ${error}` : props.tooltip}
    >
      {error ? <MenuBarExtra.Item title={`Error: ${error}`} /> : props.children}
    </MenuBarExtra>
  );
}

export default function MenuCommand(): JSX.Element {
  const { data, error, isLoading } = useWeather(getDefaultQuery());
  const { title, curcon, weatherDesc } = getMetaData(data);
  const { showMenuIcon, showMenuText } = getAppearancePreferences();

  const temp = getCurrentTemperature(curcon);
  const wind = curcon ? `${getCurrentWind(curcon)} ${getWindDirectionIcon(curcon.winddirDegree)} ` : "?";
  return (
    <WeatherMenuBarExtra
      data={data}
      error={error}
      title={showMenuText ? temp : undefined}
      icon={getWeatherMenuIcon(curcon)}
      isLoading={isLoading}
      tooltip={weatherDesc}
    >
      <MenuBarExtra.Section title="Location">
        <MenuBarExtra.Item icon={Icon.Pin} title={title} onAction={launchWeatherCommand} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Current">
        <MenuBarExtra.Item
          icon={curcon ? getWeatherCodeIcon(curcon.weatherCode) : "weather.png"}
          title="Condition"
          subtitle={weatherDesc}
          onAction={launchWeatherCommand}
        />
        <MenuBarExtra.Item
          icon={Icon.Temperature}
          title="Temperature"
          subtitle={temp || "?"}
          onAction={launchWeatherCommand}
        />
        <FeelsLikeMenuItem curcon={curcon} />
        <UVIndexMenuItem curcon={curcon} />
        <HumidityMenuItem curcon={curcon} />
        <MenuBarExtra.Item icon={"💨"} title="Wind" subtitle={wind} onAction={launchWeatherCommand} />
        <MenuBarExtra.Item
          icon={"💧"}
          title="Humidity"
          subtitle={curcon ? `${curcon.humidity}%` : "?"}
          onAction={launchWeatherCommand}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Forecast">
        {data?.weather?.map((d) => (
          <MenuBarExtra.Item
            key={d.date}
            title={getWeekday(d.date)}
            icon={getDayWeatherIcon(d)}
            subtitle={`⬆${getDayTemperature(d, "max")} ⬇ ${getDayTemperature(d, "min")}`}
            onAction={launchWeatherCommand}
          />
        ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={Icon.Link}
          title="Source"
          subtitle="wttr.in"
          onAction={() => open("https://wttr.in")}
        />
        <MenuBarExtra.Item
          title="Configure"
          icon={Icon.Gear}
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openCommandPreferences}
        />
      </MenuBarExtra.Section>
    </WeatherMenuBarExtra>
  );
}
