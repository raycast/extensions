import { Clipboard, Icon, MenuBarExtra, openCommandPreferences } from "@raycast/api";
import { getCurrentWeather } from "./hooks/hooks";
import { getUnits, getWeatherIcon } from "./utils/common-utils";

export default function MenubarWeather() {
  const { weather, location, loading } = getCurrentWeather();
  const { tempUnit, windUint } = getUnits();

  return (
    <MenuBarExtra
      isLoading={loading}
      tooltip={`${weather?.weather[0].main}, ${weather?.weather[0].description}`}
      title={` ${parseInt(weather?.main.temp + "")}${tempUnit}`}
      icon={getWeatherIcon(weather?.weather[0].icon)}
    >
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
          subtitle={` ${parseInt(weather?.main.temp_min + "")}/${parseInt(weather?.main.temp_max + "")}${tempUnit}`}
          onAction={async () => {
            await Clipboard.copy(`${weather?.main.temp_min}/${weather?.main.temp_max}${tempUnit}`);
          }}
        />
      </MenuBarExtra.Section>
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

      <MenuBarExtra.Section title={"Location"}>
        <MenuBarExtra.Item
          title={"City"}
          icon={Icon.ChessPiece}
          subtitle={` ${location?.name}`}
          onAction={async () => {
            await Clipboard.copy(`${weather?.coord.lon}`);
          }}
        />
        <MenuBarExtra.Item
          title={"Country"}
          icon={Icon.BankNote}
          subtitle={` ${location?.country}`}
          onAction={async () => {
            await Clipboard.copy(`${weather?.coord.lon}`);
          }}
        />
        <MenuBarExtra.Item
          title={"Lon"}
          icon={Icon.ArrowDown}
          subtitle={` ${weather?.coord.lon}`}
          onAction={async () => {
            await Clipboard.copy(`${weather?.coord.lon}`);
          }}
        />
        <MenuBarExtra.Item
          title={"Lat"}
          icon={Icon.ArrowRight}
          subtitle={` ${weather?.coord.lat}`}
          onAction={async () => {
            await Clipboard.copy(`${weather?.coord.lat}`);
          }}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title={"Preferences"}
        icon={Icon.Gear}
        shortcut={{ modifiers: ["cmd"], key: "," }}
        onAction={() => {
          openCommandPreferences().then(() => null);
        }}
      />
    </MenuBarExtra>
  );
}
