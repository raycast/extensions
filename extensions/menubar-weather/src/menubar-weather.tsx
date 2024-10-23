import { Cache, Clipboard, MenuBarExtra, open, openCommandPreferences, updateCommandMetadata } from "@raycast/api";
import { OPEN_METEO } from "./utils/axios-utils";
import { CacheKey, getDateIcon, getMenuItem, getUnits, isoToDateTime, isoToTime, timeHour } from "./utils/common-utils";
import { getMenuIcon, getWeatherIcon } from "./utils/icon-utils";
import {
  getWeatherDescription,
  showForecast,
  showLocation,
  showSun,
  showUVI,
  windDirection,
  windDirectionSimple,
} from "./utils/weather-utils";
import { useLatestWeather } from "./hooks/useLatestWeather";
import { useMemo } from "react";
import { useLocation } from "./hooks/useLocation";
import { OpenMeteoWeather } from "./types/types";

export default function MenubarWeather() {
  const { tempUnit, windUnit } = getUnits();
  const { data: kLocation } = useLocation();
  const { data: weatherData, isLoading } = useLatestWeather(kLocation);

  const weather: OpenMeteoWeather | undefined = useMemo(() => {
    if (!weatherData) {
      const cache = new Cache();
      const cacheStr = cache.get(CacheKey.LATEST_WEATHER);
      if (cacheStr) {
        return JSON.parse(cacheStr) as OpenMeteoWeather;
      }
    }
    return weatherData;
  }, [weatherData]);

  const menuItems: string[] = useMemo(() => {
    const menuItems = getMenuItem(weather);
    updateCommandMetadata({ subtitle: menuItems.join(" | ") }).then();
    return menuItems;
  }, [weather]);
  const weatherDescription = useMemo(() => {
    return getWeatherDescription(weather?.current_weather?.weathercode);
  }, [weather]);

  return (
    <MenuBarExtra
      isLoading={isLoading}
      tooltip={weatherDescription}
      title={menuItems.join(" | ")}
      icon={getWeatherIcon(weather?.current_weather?.weathercode, true)}
    >
      {!weather ? (
        <MenuBarExtra.Item
          title={weatherDescription}
          icon={getWeatherIcon(undefined)}
          onAction={() => {
            Clipboard.copy(weatherDescription).then(() => null);
          }}
        />
      ) : (
        <>
          {weather.current_weather && (
            <MenuBarExtra.Section title={"Weather"}>
              <MenuBarExtra.Item
                title={weatherDescription}
                icon={getWeatherIcon(weather?.current_weather?.weathercode)}
                onAction={async () => {
                  await Clipboard.copy(weatherDescription);
                }}
              />
            </MenuBarExtra.Section>
          )}

          {weather.current_weather && weather.hourly && weather.daily && (
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
                title={"Min/Max"}
                icon={getMenuIcon("Min/Max")}
                subtitle={` ${parseInt(weather?.daily.temperature_2m_min[0] + "")}${tempUnit} / ${Math.round(
                  weather?.daily.temperature_2m_max[0],
                )}${tempUnit}`}
                onAction={async () => {
                  await Clipboard.copy(
                    `${parseInt(weather?.daily.temperature_2m_min[0] + "")}${tempUnit} / ${Math.round(
                      weather?.daily.temperature_2m_max[0],
                    )}${tempUnit}`,
                  );
                }}
              />
              <MenuBarExtra.Item
                title={"Feels Like"}
                icon={getMenuIcon("Feels Like")}
                subtitle={` ${Math.round(weather?.hourly.apparent_temperature[timeHour()])}${tempUnit}`}
                onAction={async () => {
                  await Clipboard.copy(`${Math.round(weather?.hourly.apparent_temperature[timeHour()])}${tempUnit}`);
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
                    `${weather?.hourly.relativehumidity_2m[timeHour()]}${weather.hourly_units.relativehumidity_2m}`,
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
                subtitle={` ${weather?.hourly.surface_pressure[timeHour()]} ${weather.hourly_units.surface_pressure}`}
                onAction={async () => {
                  await Clipboard.copy(
                    `${weather?.hourly.surface_pressure[timeHour()]} ${weather.hourly_units.surface_pressure}`,
                  );
                }}
              />
              <MenuBarExtra.Item
                title={"Visibility"}
                icon={getMenuIcon("Visibility")}
                subtitle={` ${weather?.hourly.visibility[timeHour()]} ${weather.hourly_units.visibility}`}
                onAction={async () => {
                  await Clipboard.copy(`${weather?.hourly.visibility[timeHour()]} ${weather.hourly_units.visibility}`);
                }}
              />
            </MenuBarExtra.Section>
          )}

          {weather.current_weather && (
            <MenuBarExtra.Section title={"Wind"}>
              <MenuBarExtra.Item
                title={"Speed"}
                icon={getMenuIcon("Speed")}
                subtitle={` ${weather?.current_weather.windspeed} ${windUnit}`}
                onAction={async () => {
                  await Clipboard.copy(`${weather?.current_weather.windspeed} ${windUnit}`);
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

          {showSun && weather.daily && (
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

          {showLocation && kLocation && (
            <MenuBarExtra.Section title={"Location"}>
              {kLocation.thoroughfare && (
                <MenuBarExtra.Item
                  title={"Street"}
                  icon={getMenuIcon("Street")}
                  subtitle={` ${kLocation.thoroughfare}`}
                  onAction={async () => {
                    await Clipboard.copy(`${kLocation.thoroughfare}`);
                  }}
                />
              )}
              {kLocation.locality && (
                <MenuBarExtra.Item
                  title={"City"}
                  icon={getMenuIcon("City")}
                  subtitle={` ${kLocation.locality}`}
                  onAction={async () => {
                    await Clipboard.copy(`${kLocation.locality}`);
                  }}
                />
              )}
              {kLocation.country && (
                <MenuBarExtra.Item
                  title={"Country"}
                  icon={getMenuIcon("Country")}
                  subtitle={` ${kLocation.country}${kLocation.countryCode ? ", " + kLocation.countryCode : ""}`}
                  onAction={async () => {
                    await Clipboard.copy(
                      `${kLocation.country}${kLocation.countryCode ? ", " + kLocation.countryCode : ""}`,
                    );
                  }}
                />
              )}
              {kLocation.latitude && kLocation.longitude && (
                <MenuBarExtra.Item
                  title={"Lat, Lon"}
                  icon={getMenuIcon("Lon, Lat")}
                  subtitle={` ${kLocation.latitude?.toFixed(2)}, ${kLocation.longitude?.toFixed(2)}`}
                  onAction={async () => {
                    await Clipboard.copy(`${kLocation.latitude?.toFixed(2)}, ${kLocation.longitude?.toFixed(2)}`);
                  }}
                />
              )}
            </MenuBarExtra.Section>
          )}

          {showForecast && weather && (
            <MenuBarExtra.Section title={"Forecast"}>
              <MenuBarExtra.Submenu title={"Weather"} icon={getMenuIcon("Weather")}>
                {weather.daily?.weathercode?.map((_value, index) => {
                  const weatherDescription = getWeatherDescription(weather?.daily?.weathercode[index]);
                  const weatherIcon = getWeatherIcon(weather?.daily?.weathercode[index]);
                  return (
                    <MenuBarExtra.Item
                      key={index + weather.daily?.time[index] + weather.daily?.temperature_2m_min[index]}
                      icon={weatherIcon}
                      title={weatherDescription}
                      subtitle={weather.daily?.time[index].substring(5)}
                      onAction={async () => {
                        await Clipboard.copy(weather.daily?.time[index] + " " + weatherDescription);
                      }}
                    />
                  );
                })}
              </MenuBarExtra.Submenu>
              <MenuBarExtra.Submenu title={"Temperature"} icon={getMenuIcon("Temperature")}>
                {weather.daily?.temperature_2m_min?.map((value, index) => {
                  return (
                    <MenuBarExtra.Item
                      key={index + weather.daily?.time[index] + weather.daily?.temperature_2m_min[index]}
                      icon={getDateIcon(weather.daily?.time[index].substring(8))}
                      title={` ${parseInt(value + "")}~${Math.round(weather.daily?.temperature_2m_max[index])}${tempUnit}`}
                      subtitle={weather.daily?.time[index].substring(5)}
                      onAction={async () => {
                        await Clipboard.copy(
                          weather.daily?.time[index] +
                            ` ${parseInt(value + "")}~${Math.round(weather.daily?.temperature_2m_max[index])}${tempUnit}`,
                        );
                      }}
                    />
                  );
                })}
              </MenuBarExtra.Submenu>
              <MenuBarExtra.Submenu title={"Wind"} icon={getMenuIcon("Wind")}>
                {weather.daily?.windspeed_10m_max?.map((value, index) => {
                  return (
                    <MenuBarExtra.Item
                      key={index + weather.daily?.time[index] + weather.daily?.windspeed_10m_max[index]}
                      icon={getDateIcon(weather.daily?.time[index].substring(8))}
                      title={` ${value}${windUnit}${windDirectionSimple(weather.daily, index)}`}
                      subtitle={weather.daily?.time[index].substring(5)}
                      onAction={async () => {
                        await Clipboard.copy(
                          weather.daily?.time[index] +
                            ` ${value}${windUnit}${windDirectionSimple(weather.daily, index)}`,
                        );
                      }}
                    />
                  );
                })}
              </MenuBarExtra.Submenu>
              <MenuBarExtra.Submenu title={"Precipitation"} icon={getMenuIcon("Precipitation")}>
                {weather.daily?.rain_sum?.map((value, index) => {
                  return (
                    <MenuBarExtra.Item
                      key={index + weather.daily?.time[index] + weather.daily?.rain_sum[index]}
                      icon={getDateIcon(weather.daily?.time[index].substring(8))}
                      title={` ${value}${weather.daily_units?.rain_sum}`}
                      subtitle={weather.daily?.time[index].substring(5)}
                      onAction={async () => {
                        await Clipboard.copy(weather.daily?.time[index] + ` ${value}${weather.daily_units?.rain_sum}`);
                      }}
                    />
                  );
                })}
              </MenuBarExtra.Submenu>
              {showUVI && (
                <MenuBarExtra.Submenu title={"UVI"} icon={getMenuIcon("UVI")}>
                  {weather.daily?.uv_index_max?.map((value, index) => {
                    return (
                      <MenuBarExtra.Item
                        key={index + weather.daily?.time[index] + Math.round(value)}
                        icon={getDateIcon(weather.daily?.time[index].substring(8))}
                        title={` ${Math.round(value)}`}
                        subtitle={weather.daily?.time[index].substring(5)}
                        onAction={async () => {
                          await Clipboard.copy(weather.daily?.time[index] + ` ` + Math.round(value));
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
            {weather.current_weather && (
              <MenuBarExtra.Item
                title={"Last Updated"}
                icon={getMenuIcon("Last Updated")}
                subtitle={` ${isoToDateTime(weather.current_weather.time)}`}
                onAction={async () => {
                  await Clipboard.copy(`${isoToDateTime(weather.current_weather.time)}`);
                }}
              />
            )}
          </MenuBarExtra.Section>
          <MenuBarExtra.Section>
            <MenuBarExtra.Item
              title={"Settings…"}
              icon={getMenuIcon("Settings")}
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
