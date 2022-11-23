import { Clipboard, Icon, MenuBarExtra, open, openCommandPreferences } from "@raycast/api";
import { getCurrentWeather } from "./hooks/hooks";
import { getTime, getUnits, getWeatherIcon } from "./utils/common-utils";
import { isEmptyLonLat, latitude, longitude } from "./utils/open-weather-utils";

export default function MenubarWeather() {
  const { weather, location, loading } = getCurrentWeather();
  const { tempUnit, windUint } = getUnits();

  return (
    <MenuBarExtra
      isLoading={loading}
      tooltip={`${weather?.weather[0].main}, ${weather?.weather[0].description}`}
      title={typeof weather === "undefined" ? "" : ` ${Math.round(weather?.main.temp)}${tempUnit}`}
      icon={getWeatherIcon(weather?.weather[0].icon)}
    >
      {!loading && (
        <>
          {typeof weather !== "undefined" && (
            <>
              {typeof weather?.weather !== "undefined" && (
                <MenuBarExtra.Section title={"Weather"}>
                  {weather?.weather.map((value, index) => {
                    return (
                      <MenuBarExtra.Item
                        key={`${index} ${value.main}`}
                        title={value.main}
                        icon={getWeatherIcon(weather?.weather[0].icon)}
                        subtitle={` ${value.description}`}
                        onAction={async () => {
                          await Clipboard.copy(`${value.main} ${value.description}`);
                        }}
                      />
                    );
                  })}
                </MenuBarExtra.Section>
              )}

              {typeof weather?.main !== "undefined" && (
                <MenuBarExtra.Section title={"Temp"}>
                  <MenuBarExtra.Item
                    title={"Temperature"}
                    icon={Icon.Temperature}
                    subtitle={` ${Math.round(weather?.main.temp)}${tempUnit}`}
                    onAction={async () => {
                      await Clipboard.copy(`${weather?.main.temp}${tempUnit}`);
                    }}
                  />
                  <MenuBarExtra.Item
                    title={"Feels-like"}
                    icon={Icon.Temperature}
                    subtitle={` ${Math.round(weather?.main.feels_like)}${tempUnit}`}
                    onAction={async () => {
                      await Clipboard.copy(`${weather?.main.feels_like}${tempUnit}`);
                    }}
                  />
                  <MenuBarExtra.Item
                    title={"Min/Max"}
                    icon={Icon.Temperature}
                    subtitle={` ${Math.round(weather?.main.temp_min)}/${Math.round(weather?.main.temp_max)}${tempUnit}`}
                    onAction={async () => {
                      await Clipboard.copy(`${weather?.main.temp_min}/${weather?.main.temp_max}${tempUnit}`);
                    }}
                  />
                  <MenuBarExtra.Item
                    title={"Pressure"}
                    icon={Icon.CricketBall}
                    subtitle={` ${Math.round(weather?.main.pressure)}hPa`}
                    onAction={async () => {
                      await Clipboard.copy(`${weather?.main.pressure}hPa`);
                    }}
                  />
                  <MenuBarExtra.Item
                    title={"Humidity"}
                    icon={Icon.Raindrop}
                    subtitle={` ${Math.round(weather?.main.humidity)}%`}
                    onAction={async () => {
                      await Clipboard.copy(`${weather?.main.humidity}%`);
                    }}
                  />
                </MenuBarExtra.Section>
              )}
              {typeof weather?.wind !== "undefined" && (
                <MenuBarExtra.Section title={"Wind"}>
                  <MenuBarExtra.Item
                    title={"Speed"}
                    icon={Icon.Gauge}
                    subtitle={` ${weather?.wind.speed}${windUint}`}
                    onAction={async () => {
                      await Clipboard.copy(`${weather?.wind.speed}${windUint}`);
                    }}
                  />
                </MenuBarExtra.Section>
              )}

              {typeof weather?.rain !== "undefined" && (
                <MenuBarExtra.Section title={"Rain"}>
                  <MenuBarExtra.Item
                    title={"1Hour"}
                    icon={Icon.Raindrop}
                    subtitle={` ${weather?.rain["1h"]}mm`}
                    onAction={async () => {
                      await Clipboard.copy(`${weather?.rain["1h"]}mm`);
                    }}
                  />
                </MenuBarExtra.Section>
              )}
            </>
          )}
          {typeof weather?.sys !== "undefined" && (
            <MenuBarExtra.Section title={"Sun"}>
              <MenuBarExtra.Item
                title={"Sunrise"}
                icon={Icon.Sunrise}
                subtitle={` ${getTime(weather?.sys.sunrise)}`}
                onAction={async () => {
                  await Clipboard.copy(`${getTime(weather?.sys.sunrise)}`);
                }}
              />
              <MenuBarExtra.Item
                title={"Sunset"}
                icon={Icon.Moon}
                subtitle={` ${getTime(weather?.sys.sunset)}`}
                onAction={async () => {
                  await Clipboard.copy(`${getTime(weather?.sys.sunset)}`);
                }}
              />
            </MenuBarExtra.Section>
          )}
          {isEmptyLonLat() && typeof location !== "undefined" && typeof weather?.sys !== "undefined" && (
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
              {typeof location.lon !== "undefined" && typeof location.lat !== "undefined" && (
                <MenuBarExtra.Item
                  title={"Lon, Lat"}
                  icon={Icon.EditShape}
                  subtitle={` ${location?.lon?.toFixed(2)}, ${location?.lat?.toFixed(2)}`}
                  onAction={async () => {
                    await Clipboard.copy(`${location?.lon?.toFixed(2)}, ${location?.lat?.toFixed(2)}`);
                  }}
                />
              )}
            </MenuBarExtra.Section>
          )}

          {!isEmptyLonLat() && (
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
          <MenuBarExtra.Separator />

          <MenuBarExtra.Item
            title={"Source"}
            icon={Icon.BarChart}
            subtitle={` OpenWeather`}
            onAction={async () => {
              await open("https://openweathermap.org");
            }}
          />
          {typeof weather?.dt !== "undefined" && (
            <MenuBarExtra.Item
              title={"Detect Time"}
              icon={Icon.Download}
              subtitle={` ${getTime(weather?.dt)}`}
              onAction={async () => {
                await Clipboard.copy(`${getTime(weather?.dt)}`);
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
