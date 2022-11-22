import { Clipboard, Icon, MenuBarExtra, open, openCommandPreferences } from "@raycast/api";
import { getCurrentWeather } from "./hooks/hooks";
import { getDateTime, getTime, getUnits, getWeatherIcon } from "./utils/common-utils";

export default function MenubarWeather() {
  const { weather, location, loading } = getCurrentWeather();
  const { tempUnit, windUint } = getUnits();

  return (
    <MenuBarExtra
      isLoading={loading}
      tooltip={`${weather?.weather[0].main}, ${weather?.weather[0].description}`}
      title={typeof weather === "undefined" ? "" : ` ${parseInt(weather?.main.temp + "")}${tempUnit}`}
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
                    subtitle={` ${parseInt(weather?.main.temp + "")}${tempUnit}`}
                    onAction={async () => {
                      await Clipboard.copy(`${weather?.main.temp}${tempUnit}`);
                    }}
                  />
                  <MenuBarExtra.Item
                    title={"Feels-like"}
                    icon={Icon.Temperature}
                    subtitle={` ${parseInt(weather?.main.feels_like + "")}${tempUnit}`}
                    onAction={async () => {
                      await Clipboard.copy(`${weather?.main.feels_like}${tempUnit}`);
                    }}
                  />
                  <MenuBarExtra.Item
                    title={"Min/Max"}
                    icon={Icon.Temperature}
                    subtitle={` ${parseInt(weather?.main.temp_min + "")}/${parseInt(
                      weather?.main.temp_max + ""
                    )}${tempUnit}`}
                    onAction={async () => {
                      await Clipboard.copy(`${weather?.main.temp_min}/${weather?.main.temp_max}${tempUnit}`);
                    }}
                  />
                  <MenuBarExtra.Item
                    title={"Pressure"}
                    icon={Icon.CricketBall}
                    subtitle={` ${parseInt(weather?.main.pressure + "")}hPa`}
                    onAction={async () => {
                      await Clipboard.copy(`${parseInt(weather?.main.pressure + "hPa")}`);
                    }}
                  />
                  <MenuBarExtra.Item
                    title={"Humidity"}
                    icon={Icon.Raindrop}
                    subtitle={` ${parseInt(weather?.main.humidity + "")}%`}
                    onAction={async () => {
                      await Clipboard.copy(`${parseInt(weather?.main.humidity + "%")}`);
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
          {typeof location !== "undefined" && typeof weather?.sys !== "undefined" && (
            <MenuBarExtra.Section title={"Location"}>
              <MenuBarExtra.Item
                title={"City"}
                icon={Icon.ChessPiece}
                subtitle={` ${location?.name}`}
                onAction={async () => {
                  await Clipboard.copy(`${location?.name}`);
                }}
              />
              <MenuBarExtra.Item
                title={"Country"}
                icon={Icon.BankNote}
                subtitle={` ${location?.country}`}
                onAction={async () => {
                  location?.lat;
                  await Clipboard.copy(`${location?.country}`);
                }}
              />
              <MenuBarExtra.Item
                title={"Lon, Lat"}
                icon={Icon.EditShape}
                subtitle={` ${location?.lon.toFixed(2)}, ${location?.lat.toFixed(2)}`}
                onAction={async () => {
                  await Clipboard.copy(`${location?.lon.toFixed(2)}, ${location?.lat.toFixed(2)}`);
                }}
              />
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

          <MenuBarExtra.Separator />

          {typeof weather?.dt !== "undefined" && (
            <MenuBarExtra.Item
              title={"Time"}
              icon={Icon.Clock}
              subtitle={` ${getDateTime(weather?.dt)}`}
              onAction={async () => {
                await Clipboard.copy(`${getDateTime(weather?.dt)}`);
              }}
            />
          )}
          <MenuBarExtra.Item
            title={"Source"}
            icon={Icon.BarChart}
            subtitle={` OpenWeather`}
            onAction={async () => {
              await open("https://openweathermap.org");
            }}
          />
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
