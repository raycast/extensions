import { Clipboard, Icon, MenuBarExtra, open, openCommandPreferences } from "@raycast/api";
import { getCurrentWeather } from "./hooks/hooks";
import { getDateIcon, getUnits, isoToDateTime, isoToTime, timeHour } from "./utils/common-utils";
import {
  getWeatherDescription,
  isEmptyLonLat,
  latitude,
  longitude,
  showForecast,
  showLocation,
  showSun,
} from "./utils/weather-utils";
import { OPEN_METEO } from "./utils/axios-utils";

export default function MenubarWeather() {
  const { weather, location, loading } = getCurrentWeather();
  const { tempUnit, windUint } = getUnits();
  const { description, icon } = getWeatherDescription(weather?.current_weather?.weathercode);

  return (
    <MenuBarExtra
      isLoading={loading}
      tooltip={`${description}`}
      title={typeof weather === "undefined" ? "" : ` ${Math.round(weather?.current_weather?.temperature)}${tempUnit}`}
      icon={icon}
    >
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
                      icon={Icon.Temperature}
                      subtitle={` ${Math.round(weather?.current_weather.temperature)}${tempUnit}`}
                      onAction={async () => {
                        await Clipboard.copy(`${Math.round(weather?.current_weather.temperature)}${tempUnit}`);
                      }}
                    />
                    <MenuBarExtra.Item
                      title={"Feels-like"}
                      icon={Icon.Temperature}
                      subtitle={` ${Math.round(weather?.hourly.apparent_temperature[timeHour()])}${tempUnit}`}
                      onAction={async () => {
                        await Clipboard.copy(
                          `${Math.round(weather?.hourly.apparent_temperature[timeHour()])}${tempUnit}`
                        );
                      }}
                    />
                    <MenuBarExtra.Item
                      title={"Min/Max"}
                      icon={Icon.Temperature}
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
                    <MenuBarExtra.Item
                      title={"Pressure"}
                      icon={Icon.CricketBall}
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
                      icon={Icon.Raindrop}
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
                      icon={Icon.Eye}
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
                    icon={Icon.Gauge}
                    subtitle={` ${weather?.current_weather.windspeed}${windUint}`}
                    onAction={async () => {
                      await Clipboard.copy(`${weather?.current_weather.windspeed}${windUint}`);
                    }}
                  />
                </MenuBarExtra.Section>
              )}

              {typeof weather?.hourly !== "undefined" && weather?.hourly.rain[timeHour()] !== 0 && (
                <MenuBarExtra.Section title={"Rain"}>
                  <MenuBarExtra.Item
                    title={"1Hour"}
                    icon={Icon.Raindrop}
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
                icon={Icon.Sunrise}
                subtitle={` ${isoToTime(weather?.daily.sunrise[0])}`}
                onAction={async () => {
                  await Clipboard.copy(`${isoToTime(weather?.daily.sunrise[0])}`);
                }}
              />
              <MenuBarExtra.Item
                title={"Sunset"}
                icon={Icon.Moon}
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
                  icon={Icon.ChessPiece}
                  subtitle={` ${location?.name}`}
                  onAction={async () => {
                    await Clipboard.copy(`${location?.name}`);
                  }}
                />
              )}
              {typeof location.country !== "undefined" && (
                <MenuBarExtra.Item
                  title={"Country"}
                  icon={Icon.BankNote}
                  subtitle={` ${location?.country}`}
                  onAction={async () => {
                    await Clipboard.copy(`${location?.country}`);
                  }}
                />
              )}
              {typeof location.timezone !== "undefined" && (
                <MenuBarExtra.Item
                  title={"Timezone"}
                  icon={Icon.CircleProgress50}
                  subtitle={` ${location?.timezone}`}
                  onAction={async () => {
                    await Clipboard.copy(`${location?.timezone}`);
                  }}
                />
              )}
              {typeof location.longitude !== "undefined" && typeof location.latitude !== "undefined" && (
                <MenuBarExtra.Item
                  title={"Lon, Lat"}
                  icon={Icon.EditShape}
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
                icon={Icon.EditShape}
                subtitle={` ${parseFloat(longitude)?.toFixed(2)}, ${parseFloat(latitude)?.toFixed(2)}`}
                onAction={async () => {
                  await Clipboard.copy(`${parseFloat(longitude)?.toFixed(2)}, ${parseFloat(latitude)?.toFixed(2)}`);
                }}
              />
            </MenuBarExtra.Section>
          )}

          {showForecast && typeof weather !== "undefined" && (
            <MenuBarExtra.Section title={"Forecast"}>
              <MenuBarExtra.Submenu title={"Weather"} icon={Icon.Cloud}>
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
              <MenuBarExtra.Submenu title={"Temperature"} icon={Icon.Temperature}>
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
              <MenuBarExtra.Submenu title={"Wind"} icon={Icon.Boat}>
                {weather?.daily?.windspeed_10m_max?.map((value, index) => {
                  return (
                    <MenuBarExtra.Item
                      key={index + weather?.daily?.time[index] + weather?.daily?.windspeed_10m_max[index]}
                      icon={getDateIcon(weather?.daily?.time[index].substring(8))}
                      title={` ${value}${windUint}`}
                      onAction={async () => {
                        await Clipboard.copy(weather?.daily?.time[index] + ` ${value}${windUint}`);
                      }}
                    />
                  );
                })}
              </MenuBarExtra.Submenu>
              <MenuBarExtra.Submenu title={"Rain"} icon={Icon.Raindrop}>
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
            </MenuBarExtra.Section>
          )}
          <MenuBarExtra.Separator />

          <MenuBarExtra.Item
            title={"Source"}
            icon={Icon.BarChart}
            subtitle={` Open-Meteo`}
            onAction={async () => {
              await open(OPEN_METEO);
            }}
          />
          {typeof weather?.current_weather !== "undefined" && (
            <MenuBarExtra.Item
              title={"Detect Time"}
              icon={Icon.Download}
              subtitle={` ${isoToDateTime(weather?.current_weather.time)}`}
              onAction={async () => {
                await Clipboard.copy(`${isoToDateTime(weather?.current_weather.time)}`);
              }}
            />
          )}
          <MenuBarExtra.Separator />
          <MenuBarExtra.Item
            title={"Preferences"}
            icon={Icon.Gear}
            shortcut={{ modifiers: ["cmd"], key: "," }}
            onAction={() => {
              openCommandPreferences().then(() => null);
            }}
          />
        </>
      )}
    </MenuBarExtra>
  );
}
