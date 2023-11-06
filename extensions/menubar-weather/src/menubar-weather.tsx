import { Clipboard, MenuBarExtra, open, openCommandPreferences } from "@raycast/api";
import { getCurrentWeather } from "./hooks/hooks";
import { getDateIcon, getMenuItem, getUnits, isoToDateTime, isoToTime, timeHour } from "./utils/common-utils";
import {
  getWeatherDescription,
  isEmptyLonLat,
  latitude,
  longitude,
  showForecast,
  showLocation,
  showSun,
  showUVI,
  windDirection,
  windDirectionSimple,
} from "./utils/weather-utils";
import { OPEN_METEO } from "./utils/axios-utils";
import { getMenuIcon } from "./utils/icon-utils";

export default function MenubarWeather() {
  const { weather, location, loading } = getCurrentWeather();
  const { tempUnit, windUnit } = getUnits();
  const { description, icon } = getWeatherDescription(weather?.current_weather?.weathercode);

  const menuItems: string[] = getMenuItem(weather);

  return (
    <MenuBarExtra isLoading={loading} tooltip={`${description}`} title={menuItems.join(" | ")} icon={icon}>
      {!loading && (
        <>
          {typeof weather === "undefined" && (
            <MenuBarExtra.Item
              title={"No weather info, try again later"}
              icon={icon}
              onAction={() => {
                Clipboard.copy("No weather info, try again later").then(() => null);
              }}
            />
          )}
          {typeof weather !== "undefined" && (
            <>
              {typeof weather?.current_weather !== "undefined" && (
                <MenuBarExtra.Section title={"Weather"}>
                  <MenuBarExtra.Item
                    title={description}
                    icon={icon}
                    onAction={async () => {
                      await Clipboard.copy(description);
                    }}
                  />
                </MenuBarExtra.Section>
              )}

              {typeof weather?.current_weather !== "undefined" &&
                typeof weather?.hourly !== "undefined" &&
                typeof weather?.daily !== "undefined" && (
                  <MenuBarExtra.Section title={"Temp"}>
                    <MenuBarExtra.Item
                      title={"Temperature"}
                      icon={getMenuIcon("Temperature")}
                      subtitle={` ${Math.round(weather?.current_weather.temperature)}${tempUnit}`}
                      onAction={async () => {
                        await Clipboard.copy(`${Math.round(weather?.current_weather.temperature)}${tempUnit}`);
                      }}
                    />
                    <MenuBarExtra.Item
                      title={"Feels-like"}
                      icon={getMenuIcon("Feels-like")}
                      subtitle={` ${Math.round(weather?.hourly.apparent_temperature[timeHour()])}${tempUnit}`}
                      onAction={async () => {
                        await Clipboard.copy(
                          `${Math.round(weather?.hourly.apparent_temperature[timeHour()])}${tempUnit}`
                        );
                      }}
                    />
                    <MenuBarExtra.Item
                      title={"Min/Max"}
                      icon={getMenuIcon("Min/Max")}
                      subtitle={` ${parseInt(weather?.daily.temperature_2m_min[0] + "")}/${Math.round(
                        weather?.daily.temperature_2m_max[0]
                      )}${tempUnit}`}
                      onAction={async () => {
                        await Clipboard.copy(
                          `${parseInt(weather?.daily.temperature_2m_min[0] + "")}/${Math.round(
                            weather?.daily.temperature_2m_max[0]
                          )}${tempUnit}`
                        );
                      }}
                    />
                    {showUVI && (
                      <MenuBarExtra.Item
                        title={"UVI"}
                        icon={getMenuIcon("UVI")}
                        subtitle={` ${Math.round(weather?.daily.uv_index_max[0])}`}
                        onAction={async () => {
                          await Clipboard.copy(`${Math.round(weather?.daily.uv_index_max[0])}`);
                        }}
                      />
                    )}
                    <MenuBarExtra.Item
                      title={"Pressure"}
                      icon={getMenuIcon("Pressure")}
                      subtitle={` ${weather?.hourly.surface_pressure[timeHour()]}${
                        weather.hourly_units.surface_pressure
                      }`}
                      onAction={async () => {
                        await Clipboard.copy(
                          `${weather?.hourly.surface_pressure[timeHour()]}${weather.hourly_units.surface_pressure}`
                        );
                      }}
                    />
                    <MenuBarExtra.Item
                      title={"Humidity"}
                      icon={getMenuIcon("Humidity")}
                      subtitle={` ${weather?.hourly.relativehumidity_2m[timeHour()]}${
                        weather.hourly_units.relativehumidity_2m
                      }`}
                      onAction={async () => {
                        await Clipboard.copy(
                          `${weather?.hourly.relativehumidity_2m[timeHour()]}${
                            weather.hourly_units.relativehumidity_2m
                          }`
                        );
                      }}
                    />
                    <MenuBarExtra.Item
                      title={"Visibility"}
                      icon={getMenuIcon("Visibility")}
                      subtitle={` ${weather?.hourly.visibility[timeHour()]}${weather.hourly_units.visibility}`}
                      onAction={async () => {
                        await Clipboard.copy(
                          `${weather?.hourly.visibility[timeHour()]}${weather.hourly_units.visibility}`
                        );
                      }}
                    />
                  </MenuBarExtra.Section>
                )}

              {typeof weather?.current_weather !== "undefined" && (
                <MenuBarExtra.Section title={"Wind"}>
                  <MenuBarExtra.Item
                    title={"Speed"}
                    icon={getMenuIcon("Speed")}
                    subtitle={` ${weather?.current_weather.windspeed}${windUnit}`}
                    onAction={async () => {
                      await Clipboard.copy(`${weather?.current_weather.windspeed}${windUnit}`);
                    }}
                  />
                  <MenuBarExtra.Item
                    title={"Direction"}
                    icon={getMenuIcon("Direction")}
                    subtitle={` ${windDirection(weather?.current_weather.winddirection)}`}
                    onAction={async () => {
                      await Clipboard.copy(`${windDirection(weather?.current_weather.winddirection)}`);
                    }}
                  />
                </MenuBarExtra.Section>
              )}

              {typeof weather?.hourly !== "undefined" && weather?.hourly.rain[timeHour()] !== 0 && (
                <MenuBarExtra.Section title={"Rain"}>
                  <MenuBarExtra.Item
                    title={"1Hour"}
                    icon={getMenuIcon("1Hour")}
                    subtitle={` ${weather?.hourly.rain[timeHour()]}${weather.hourly_units.rain}`}
                    onAction={async () => {
                      await Clipboard.copy(`${weather?.hourly.rain[timeHour()]}${weather.hourly_units.rain}`);
                    }}
                  />
                </MenuBarExtra.Section>
              )}
            </>
          )}

          {showSun && typeof weather?.daily !== "undefined" && (
            <MenuBarExtra.Section title={"Sun"}>
              <MenuBarExtra.Item
                title={"Sunrise"}
                icon={getMenuIcon("Sunrise")}
                subtitle={` ${isoToTime(weather?.daily.sunrise[0])}`}
                onAction={async () => {
                  await Clipboard.copy(`${isoToTime(weather?.daily.sunrise[0])}`);
                }}
              />
              <MenuBarExtra.Item
                title={"Sunset"}
                icon={getMenuIcon("Sunset")}
                subtitle={` ${isoToTime(weather?.daily.sunset[0])}`}
                onAction={async () => {
                  await Clipboard.copy(`${isoToTime(weather?.daily.sunset[0])}`);
                }}
              />
            </MenuBarExtra.Section>
          )}
          {showLocation && typeof weather !== "undefined" && isEmptyLonLat() && typeof location !== "undefined" && (
            <MenuBarExtra.Section title={"Location"}>
              {typeof location.name !== "undefined" && (
                <MenuBarExtra.Item
                  title={"City"}
                  icon={getMenuIcon("City")}
                  subtitle={` ${location?.name}`}
                  onAction={async () => {
                    await Clipboard.copy(`${location?.name}`);
                  }}
                />
              )}
              {typeof location.country !== "undefined" && (
                <MenuBarExtra.Item
                  title={"Country"}
                  icon={getMenuIcon("Country")}
                  subtitle={` ${location?.country}`}
                  onAction={async () => {
                    await Clipboard.copy(`${location?.country}`);
                  }}
                />
              )}
              {typeof location.timezone !== "undefined" && (
                <MenuBarExtra.Item
                  title={"Timezone"}
                  icon={getMenuIcon("Timezone")}
                  subtitle={` ${location?.timezone}`}
                  onAction={async () => {
                    await Clipboard.copy(`${location?.timezone}`);
                  }}
                />
              )}
              {typeof location.longitude !== "undefined" && typeof location.latitude !== "undefined" && (
                <MenuBarExtra.Item
                  title={"Lon, Lat"}
                  icon={getMenuIcon("Lon, Lat")}
                  subtitle={` ${location?.longitude?.toFixed(2)}, ${location?.latitude?.toFixed(2)}`}
                  onAction={async () => {
                    await Clipboard.copy(`${location?.longitude?.toFixed(2)}, ${location?.latitude?.toFixed(2)}`);
                  }}
                />
              )}
            </MenuBarExtra.Section>
          )}

          {showLocation && !isEmptyLonLat() && (
            <MenuBarExtra.Section title={"Location"}>
              <MenuBarExtra.Item
                title={"Lon, Lat"}
                icon={getMenuIcon("Lon, Lat")}
                subtitle={` ${parseFloat(longitude)?.toFixed(2)}, ${parseFloat(latitude)?.toFixed(2)}`}
                onAction={async () => {
                  await Clipboard.copy(`${parseFloat(longitude)?.toFixed(2)}, ${parseFloat(latitude)?.toFixed(2)}`);
                }}
              />
            </MenuBarExtra.Section>
          )}

          {showForecast && typeof weather !== "undefined" && (
            <MenuBarExtra.Section title={"Forecast"}>
              <MenuBarExtra.Submenu title={"Weather"} icon={getMenuIcon("Weather")}>
                {weather?.daily?.weathercode?.map((value, index) => {
                  const { icon, description } = getWeatherDescription(weather?.daily?.weathercode[index]);
                  return (
                    <MenuBarExtra.Item
                      key={index + weather?.daily?.time[index] + weather?.daily?.temperature_2m_min[index]}
                      icon={icon}
                      title={description}
                      onAction={async () => {
                        await Clipboard.copy(weather?.daily?.time[index] + " " + description);
                      }}
                    />
                  );
                })}
              </MenuBarExtra.Submenu>
              <MenuBarExtra.Submenu title={"Temperature"} icon={getMenuIcon("Temperature")}>
                {weather?.daily?.temperature_2m_min?.map((value, index) => {
                  return (
                    <MenuBarExtra.Item
                      key={index + weather?.daily?.time[index] + weather?.daily?.temperature_2m_min[index]}
                      icon={getDateIcon(weather?.daily?.time[index].substring(8))}
                      title={` ${parseInt(value + "")}~${Math.round(
                        weather?.daily?.temperature_2m_max[index]
                      )}${tempUnit}`}
                      onAction={async () => {
                        await Clipboard.copy(
                          weather?.daily?.time[index] +
                            ` ${parseInt(value + "")}~${Math.round(
                              weather?.daily?.temperature_2m_max[index]
                            )}${tempUnit}`
                        );
                      }}
                    />
                  );
                })}
              </MenuBarExtra.Submenu>
              <MenuBarExtra.Submenu title={"Wind"} icon={getMenuIcon("Wind")}>
                {weather?.daily?.windspeed_10m_max?.map((value, index) => {
                  return (
                    <MenuBarExtra.Item
                      key={index + weather?.daily?.time[index] + weather?.daily?.windspeed_10m_max[index]}
                      icon={getDateIcon(weather?.daily?.time[index].substring(8))}
                      title={` ${value}${windUnit}${windDirectionSimple(weather?.daily, index)}`}
                      onAction={async () => {
                        await Clipboard.copy(
                          weather?.daily?.time[index] +
                            ` ${value}${windUnit}${windDirectionSimple(weather?.daily, index)}`
                        );
                      }}
                    />
                  );
                })}
              </MenuBarExtra.Submenu>
              <MenuBarExtra.Submenu title={"Rain"} icon={getMenuIcon("Rain")}>
                {weather?.daily?.rain_sum?.map((value, index) => {
                  return (
                    <MenuBarExtra.Item
                      key={index + weather?.daily?.time[index] + weather?.daily?.rain_sum[index]}
                      icon={getDateIcon(weather?.daily?.time[index].substring(8))}
                      title={` ${value}${weather?.daily_units?.rain_sum}`}
                      onAction={async () => {
                        await Clipboard.copy(
                          weather?.daily?.time[index] + ` ${value}${weather?.daily_units?.rain_sum}`
                        );
                      }}
                    />
                  );
                })}
              </MenuBarExtra.Submenu>
              {showUVI && (
                <MenuBarExtra.Submenu title={"UVI"} icon={getMenuIcon("UVI")}>
                  {weather?.daily?.uv_index_max?.map((value, index) => {
                    return (
                      <MenuBarExtra.Item
                        key={index + weather?.daily?.time[index] + Math.round(value)}
                        icon={getDateIcon(weather?.daily?.time[index].substring(8))}
                        title={` ${Math.round(value)}`}
                        onAction={async () => {
                          await Clipboard.copy(weather?.daily?.time[index] + ` ` + Math.round(value));
                        }}
                      />
                    );
                  })}
                </MenuBarExtra.Submenu>
              )}
            </MenuBarExtra.Section>
          )}
          <MenuBarExtra.Section>
            <MenuBarExtra.Item
              title={"Source"}
              icon={getMenuIcon("Source")}
              subtitle={` Open-Meteo`}
              onAction={async () => {
                await open(OPEN_METEO);
              }}
            />
            {typeof weather?.current_weather !== "undefined" && (
              <MenuBarExtra.Item
                title={"Detect Time"}
                icon={getMenuIcon("Detect Time")}
                subtitle={` ${isoToDateTime(weather?.current_weather.time)}`}
                onAction={async () => {
                  await Clipboard.copy(`${isoToDateTime(weather?.current_weather.time)}`);
                }}
              />
            )}
          </MenuBarExtra.Section>
          <MenuBarExtra.Section>
            <MenuBarExtra.Item
              title={"Preferences"}
              icon={getMenuIcon("Preferences")}
              shortcut={{ modifiers: ["cmd"], key: "," }}
              onAction={() => {
                openCommandPreferences().then(() => null);
              }}
            />
          </MenuBarExtra.Section>
        </>
      )}
    </MenuBarExtra>
  );
}
