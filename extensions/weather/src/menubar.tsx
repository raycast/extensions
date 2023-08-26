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
  getMetaData,
  getDefaultQuery,
  getDayWeatherIcon,
  getWeekday,
  getDayTemperature,
} from "./components/weather";
import { getWeatherCodeIcon, WeatherIcons } from "./icons";
import {
  Area,
  getAreaValues,
  getCurrentFeelLikeTemperature,
  getCurrentHumidity,
  getCurrentObservationTime,
  getCurrentPressure,
  getCurrentSun,
  getCurrentUVIndex,
  getCurrentVisibility,
  getCurrentWindConditions,
  Weather,
  WeatherConditions,
} from "./wttr";
import { useWeather } from "./components/hooks";

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

function WindMenubarItem(props: { curcon: WeatherConditions | undefined }) {
  const windCon = getCurrentWindConditions(props.curcon);
  if (!windCon) {
    return null;
  }
  const wind = `${windCon.speed} ${windCon.unit} ${windCon.dirIcon} (${windCon.dirText})`;
  return <MenuBarExtra.Item icon={"💨"} title="Wind" subtitle={wind} onAction={launchWeatherCommand} />;
}

function VisibilityMenubarItem(props: { curcon: WeatherConditions | undefined }) {
  const vis = getCurrentVisibility(props.curcon);
  if (!vis) {
    return null;
  }
  return (
    <MenuBarExtra.Item
      icon={WeatherIcons.Visibility}
      title="Visibility"
      subtitle={vis.distanceAndUnit}
      onAction={launchWeatherCommand}
    />
  );
}

function PressureMenubarItem(props: { curcon: WeatherConditions | undefined }) {
  const p = getCurrentPressure(props.curcon);
  if (!p) {
    return null;
  }
  return (
    <MenuBarExtra.Item
      icon={WeatherIcons.Pressure}
      title="Pressure"
      subtitle={p.valueAndUnit}
      onAction={launchWeatherCommand}
    />
  );
}

function LocationMenubarSection(props: { area: Area | undefined }) {
  const a = getAreaValues(props.area);
  if (!a) {
    return null;
  }
  return (
    <MenuBarExtra.Section title="Location">
      {a.areaName && (
        <MenuBarExtra.Item
          title="Area"
          icon={WeatherIcons.Country}
          subtitle={a.areaName}
          onAction={launchWeatherCommand}
        />
      )}
      {a.region && (
        <MenuBarExtra.Item
          title="Region"
          subtitle={a.region}
          icon={WeatherIcons.Region}
          onAction={launchWeatherCommand}
        />
      )}
      {a.country && (
        <MenuBarExtra.Item
          title="Country"
          subtitle={a.country}
          icon={WeatherIcons.Country}
          onAction={launchWeatherCommand}
        />
      )}
      {a.latitude && a.longitude && (
        <MenuBarExtra.Item
          title="Lon, Lat"
          subtitle={`${a.longitude},${a.latitude}`}
          icon={WeatherIcons.Coordinate}
          onAction={launchWeatherCommand}
        />
      )}
    </MenuBarExtra.Section>
  );
}

function SunMenubarSection(props: { data: Weather | undefined }) {
  const sun = getCurrentSun(props.data);
  if (!sun) {
    return null;
  }
  const { curcon } = getMetaData(props.data);
  return (
    <MenuBarExtra.Section title="Sun">
      <UVIndexMenuItem curcon={curcon} />
      <MenuBarExtra.Item
        title="Sunrise"
        subtitle={sun.sunrise}
        icon={WeatherIcons.Sunrise}
        onAction={launchWeatherCommand}
      />
      <MenuBarExtra.Item
        title="Sunset"
        subtitle={sun.sunset}
        icon={WeatherIcons.Sunset}
        onAction={launchWeatherCommand}
      />
    </MenuBarExtra.Section>
  );
}

function ObservationTimeMenubarItem(props: { curcon: WeatherConditions | undefined }) {
  const obs = getCurrentObservationTime(props.curcon);
  if (!obs) {
    return null;
  }
  return <MenuBarExtra.Item title="Observation" subtitle={obs} icon={Icon.Clock} onAction={launchWeatherCommand} />;
}

export default function MenuCommand(): JSX.Element {
  const { data, error, isLoading } = useWeather(getDefaultQuery());
  const { curcon, weatherDesc, area } = getMetaData(data);
  const { showMenuText } = getAppearancePreferences();

  const temp = getCurrentTemperature(curcon);

  return (
    <WeatherMenuBarExtra
      data={data}
      error={error}
      title={showMenuText ? temp : undefined}
      icon={getWeatherMenuIcon(curcon)}
      isLoading={isLoading}
      tooltip={weatherDesc}
    >
      <MenuBarExtra.Section title="Weather">
        <MenuBarExtra.Item
          icon={curcon ? getWeatherCodeIcon(curcon.weatherCode) : "weather.png"}
          title="Condition"
          subtitle={weatherDesc}
          onAction={launchWeatherCommand}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Temperature">
        <MenuBarExtra.Item
          icon={Icon.Temperature}
          title="Temperature"
          subtitle={temp || "?"}
          onAction={launchWeatherCommand}
        />
        <FeelsLikeMenuItem curcon={curcon} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Air">
        <WindMenubarItem curcon={curcon} />
        <PressureMenubarItem curcon={curcon} />
        <HumidityMenuItem curcon={curcon} />
        <VisibilityMenubarItem curcon={curcon} />
      </MenuBarExtra.Section>
      <SunMenubarSection data={data} />
      <LocationMenubarSection area={area} />
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
        <ObservationTimeMenubarItem curcon={curcon} />
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
