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
import { getCurrentTemperature, getCurrentWind, getMetaData, useWeather, getDefaultQuery } from "./components/weather";
import { getWeatherCodeIcon, getWindDirectionIcon } from "./icons";
import { WeatherConditions } from "./wttr";

function launchWeatherCommand() {
  launchCommand({ name: "index", type: LaunchType.UserInitiated });
}

function getAppearancePreferences(): { showMenuIcon: boolean; showMenuText: boolean } {
  const prefs = getPreferenceValues();
  const showMenuText = prefs.showmenutext as boolean | true;
  const showMenuIcon = showMenuText == false ? true : (prefs.showmenuicon as boolean | true);
  return {
    showMenuIcon,
    showMenuText,
  };
}

function getWeatherMenuIcon(curcon: WeatherConditions | undefined): Image.ImageLike {
  return curcon ? getWeatherCodeIcon(curcon.weatherCode) : "weather.png";
}

export default function MenuCommand(): JSX.Element {
  const { data, isLoading } = useWeather(getDefaultQuery());
  const { title, curcon, weatherDesc } = getMetaData(data);
  const { showMenuIcon, showMenuText } = getAppearancePreferences();
  console.log(showMenuIcon);

  const temp = getCurrentTemperature(curcon);
  const wind = curcon ? `${getCurrentWind(curcon)} ${getWindDirectionIcon(curcon.winddirDegree)} ` : "?";
  return (
    <MenuBarExtra
      title={showMenuText ? temp : undefined}
      icon={showMenuIcon ? getWeatherMenuIcon(curcon) : undefined}
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
        <MenuBarExtra.Item icon={"💨"} title="Wind" subtitle={wind} onAction={launchWeatherCommand} />
        <MenuBarExtra.Item
          icon={"💧"}
          title="Humidity"
          subtitle={curcon ? `${curcon.humidity}%` : "?"}
          onAction={launchWeatherCommand}
        />
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
    </MenuBarExtra>
  );
}
