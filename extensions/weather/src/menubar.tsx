import {
  Color,
  getPreferenceValues,
  Icon,
  Image,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  open,
  openCommandPreferences,
} from "@raycast/api";
import { useWeather } from "./components/hooks";
import {
  getCurrentTemperature,
  getDayTemperature,
  getDayWeatherIcon,
  getDefaultQuery,
  getMetaData,
  getWeekday,
  WttrDay,
} from "./components/weather";
import { getWeatherCodeIcon, WeatherIcons } from "./icons";
import { getTemperatureUnit } from "./unit";
import { convertToRelativeDate } from "./utils";
import {
  Area,
  convertToTimeString,
  getAreaValues,
  getCurrentCloudCover,
  getCurrentFeelLikeTemperature,
  getCurrentHumidity,
  getCurrentMoon,
  getCurrentObservationTime,
  getCurrentPressure,
  getCurrentRain,
  getCurrentSun,
  getCurrentSunHours,
  getCurrentTemperatureMinMax,
  getCurrentUVIndex,
  getCurrentVisibility,
  getCurrentWindConditions,
  getDaySnowInfo,
  Weather,
  WeatherConditions,
  WeatherData,
} from "./wttr";

function launchWeatherCommand() {
  launchCommand({ name: "index", type: LaunchType.UserInitiated });
}

export interface LaunchContextDay {
  day?: WttrDay;
}

function launchWeatherCommandWithDate(context: LaunchContextDay) {
  launchCommand({ name: "index", type: LaunchType.UserInitiated, context: context });
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

function getWeatherMenuIcon(curcon: WeatherConditions | undefined): string {
  const { showMenuIcon, showMenuText } = getAppearancePreferences();
  if (!showMenuIcon && !showMenuText) {
    return WeatherIcons.Cloud;
  }
  if (!showMenuIcon) {
    return "";
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
      icon={{ source: WeatherIcons.FeelsLike, tintColor: Color.PrimaryText }}
      onAction={launchWeatherCommand}
    />
  );
}

function TemperatureMin(props: { weather: Weather | undefined }) {
  const t = getCurrentTemperatureMinMax(props.weather);
  if (!t) {
    return null;
  }
  return (
    <MenuBarExtra.Item
      title="Min"
      icon={{ source: WeatherIcons.ArrowDown, tintColor: Color.PrimaryText }}
      subtitle={`${t.minTemp} ${getTemperatureUnit()}`}
      onAction={launchWeatherCommand}
    />
  );
}

function TemperatureMax(props: { weather: Weather | undefined }) {
  const t = getCurrentTemperatureMinMax(props.weather);
  if (!t) {
    return null;
  }
  return (
    <MenuBarExtra.Item
      title="Max"
      icon={{ source: WeatherIcons.ArrowUp, tintColor: Color.PrimaryText }}
      subtitle={`${t.maxTemp} ${getTemperatureUnit()}`}
      onAction={launchWeatherCommand}
    />
  );
}

function RainMenuItem(props: { curcon: WeatherConditions | undefined }) {
  const r = getCurrentRain(props.curcon);
  if (!r) {
    return null;
  }
  return (
    <MenuBarExtra.Item
      title="Rain"
      icon={{ source: WeatherIcons.Rain, tintColor: Color.PrimaryText }}
      subtitle={r.valueAndUnit}
      onAction={launchWeatherCommand}
    />
  );
}

function CloudCoverMenuItem(props: { curcon: WeatherConditions | undefined }) {
  const r = getCurrentCloudCover(props.curcon);
  if (!r) {
    return null;
  }
  return (
    <MenuBarExtra.Item
      title="Cloud Cover"
      icon={{ source: WeatherIcons.Cloud, tintColor: Color.PrimaryText }}
      subtitle={r.valueAndUnit}
      onAction={launchWeatherCommand}
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
      icon={{ source: WeatherIcons.UVIndex, tintColor: Color.PrimaryText }}
      onAction={launchWeatherCommand}
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
      icon={{ source: WeatherIcons.Humidity, tintColor: Color.PrimaryText }}
      onAction={launchWeatherCommand}
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
  return (
    <MenuBarExtra.Item
      icon={{ source: WeatherIcons.Wind, tintColor: Color.PrimaryText }}
      title="Wind"
      subtitle={wind}
      onAction={launchWeatherCommand}
    />
  );
}

function VisibilityMenubarItem(props: { curcon: WeatherConditions | undefined }) {
  const vis = getCurrentVisibility(props.curcon);
  if (!vis) {
    return null;
  }
  return (
    <MenuBarExtra.Item
      icon={{ source: WeatherIcons.Visibility, tintColor: Color.PrimaryText }}
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
      icon={{ source: WeatherIcons.Pressure, tintColor: Color.PrimaryText }}
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
          icon={{ source: WeatherIcons.Area, tintColor: Color.PrimaryText }}
          subtitle={a.areaName}
          onAction={launchWeatherCommand}
        />
      )}
      {a.region && (
        <MenuBarExtra.Item
          title="Region"
          subtitle={a.region}
          icon={{ source: WeatherIcons.Region, tintColor: Color.PrimaryText }}
          onAction={launchWeatherCommand}
        />
      )}
      {a.country && (
        <MenuBarExtra.Item
          title="Country"
          subtitle={a.country}
          icon={{ source: WeatherIcons.Country, tintColor: Color.PrimaryText }}
          onAction={launchWeatherCommand}
        />
      )}
      {a.latitude && a.longitude && (
        <MenuBarExtra.Item
          title="Lon, Lat"
          subtitle={`${a.longitude},${a.latitude}`}
          icon={{ source: WeatherIcons.Coordinates, tintColor: Color.PrimaryText }}
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
  const sunHours = getCurrentSunHours(props.data);
  return (
    <MenuBarExtra.Section title="Sun">
      <UVIndexMenuItem curcon={curcon} />
      {sunHours && (
        <MenuBarExtra.Item
          title="Sun Hours"
          subtitle={sunHours.valueAndUnit}
          icon={{ source: WeatherIcons.SunHours, tintColor: Color.PrimaryText }}
          onAction={launchWeatherCommand}
        />
      )}
      <MenuBarExtra.Item
        title="Sunrise"
        subtitle={convertToTimeString(sun.sunrise)}
        icon={{ source: WeatherIcons.Sunrise, tintColor: Color.PrimaryText }}
        onAction={launchWeatherCommand}
      />
      <MenuBarExtra.Item
        title="Sunset"
        subtitle={convertToTimeString(sun.sunset)}
        icon={{ source: WeatherIcons.Sunset, tintColor: Color.PrimaryText }}
        onAction={launchWeatherCommand}
      />
    </MenuBarExtra.Section>
  );
}

function MoonMenubarSection(props: { data: Weather | undefined }) {
  const moon = getCurrentMoon(props.data);
  if (!moon) {
    return null;
  }
  const phase = `Phase: ${moon.moonPhase}`;
  return (
    <MenuBarExtra.Section title="Moon">
      <MenuBarExtra.Item
        title="Moonrise"
        subtitle={convertToTimeString(moon.moonrise)}
        tooltip={phase}
        icon={{ source: WeatherIcons.Moonrise, tintColor: Color.PrimaryText }}
        onAction={launchWeatherCommand}
      />
      <MenuBarExtra.Item
        title="Moonset"
        subtitle={convertToTimeString(moon.moonset)}
        tooltip={phase}
        icon={{ source: WeatherIcons.Moonset, tintColor: Color.PrimaryText }}
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
  const relative = convertToRelativeDate(obs) || obs;
  return (
    <MenuBarExtra.Item
      title="Observation"
      subtitle={relative}
      tooltip={`Observation Time from Weather Provider: ${obs}`}
      icon={{ source: WeatherIcons.Observation, tintColor: Color.PrimaryText }}
      onAction={launchWeatherCommand}
    />
  );
}

function LastFetchTimeMenubarItem(props: { fetched: Date | undefined }) {
  const f = props.fetched;
  const relative = f ? convertToRelativeDate(f) || f?.toLocaleString() : "-";
  return (
    <MenuBarExtra.Item
      title="Fetched"
      subtitle={relative}
      tooltip={`Fetched from Weather Provider: ${f ? f.toLocaleString() : "-"}`}
      icon={{ source: WeatherIcons.Fetched, tintColor: Color.PrimaryText }}
      onAction={launchWeatherCommand}
    />
  );
}

function WeatherForecastDay(props: { day: WeatherData; fullTitle: string }) {
  const d = props.day;
  const valParts = [`⬆ ${getDayTemperature(d, "max")}`, `⬇ ${getDayTemperature(d, "min")}`];
  const snow = getDaySnowInfo(d);
  if (d.sunHour) {
    valParts.push(`☀ ${d.sunHour}h`);
  }
  if (snow && snow.value > 0) {
    valParts.push(`❄ ${snow.valueAndUnit}`);
  }
  const st = valParts.join(" ");
  const weekday = getWeekday(d.date);
  return (
    <MenuBarExtra.Item
      title={weekday}
      icon={{ source: getDayWeatherIcon(d), tintColor: Color.PrimaryText }}
      subtitle={st}
      onAction={() => launchWeatherCommandWithDate({ day: { date: d.date, title: `${props.fullTitle} - ${weekday}` } })}
    />
  );
}

export default function MenuCommand(): JSX.Element {
  const { data, error, isLoading, fetchDate } = useWeather(getDefaultQuery());
  const { title, curcon, weatherDesc, area } = getMetaData(data);
  const { showMenuText } = getAppearancePreferences();

  const temp = getCurrentTemperature(curcon);

  return (
    <WeatherMenuBarExtra
      data={data}
      error={error}
      title={showMenuText ? temp : undefined}
      icon={{ source: getWeatherMenuIcon(curcon), tintColor: Color.PrimaryText }}
      isLoading={isLoading}
      tooltip={weatherDesc}
    >
      <MenuBarExtra.Section title="Weather">
        <MenuBarExtra.Item
          icon={{ source: getWeatherCodeIcon(curcon?.weatherCode), tintColor: Color.PrimaryText }}
          title="Condition"
          subtitle={weatherDesc}
          onAction={launchWeatherCommand}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Temperature">
        <MenuBarExtra.Item
          icon={{ source: WeatherIcons.Temperature, tintColor: Color.PrimaryText }}
          title="Temperature"
          subtitle={temp || "?"}
          onAction={launchWeatherCommand}
        />
        <FeelsLikeMenuItem curcon={curcon} />
        <TemperatureMin weather={data} />
        <TemperatureMax weather={data} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Air">
        <WindMenubarItem curcon={curcon} />
        <RainMenuItem curcon={curcon} />
        <PressureMenubarItem curcon={curcon} />
        <HumidityMenuItem curcon={curcon} />
        <CloudCoverMenuItem curcon={curcon} />
        <VisibilityMenubarItem curcon={curcon} />
      </MenuBarExtra.Section>
      <SunMenubarSection data={data} />
      <MoonMenubarSection data={data} />
      <MenuBarExtra.Section title="Forecast">
        {data?.weather?.map((d) => <WeatherForecastDay key={d.date} day={d} fullTitle={title} />)}
      </MenuBarExtra.Section>
      <LocationMenubarSection area={area} />
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={{ source: WeatherIcons.Source, tintColor: Color.PrimaryText }}
          title="Source"
          subtitle="wttr.in"
          onAction={() => open("https://wttr.in")}
        />
        <ObservationTimeMenubarItem curcon={curcon} />
        <LastFetchTimeMenubarItem fetched={fetchDate} />
        <MenuBarExtra.Item
          title="Settings…"
          icon={{ source: WeatherIcons.Settings, tintColor: Color.PrimaryText }}
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openCommandPreferences}
        />
      </MenuBarExtra.Section>
    </WeatherMenuBarExtra>
  );
}
