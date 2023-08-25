import { ActionPanel, List, Action, LocalStorage, useNavigation, Clipboard, closeMainWindow, Icon } from "@raycast/api";
import { CityData, findFromCityStateProvince } from "city-timezones";
import { useEffect, useState, useMemo } from "react";

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

function AddCityView({ initialCityName, onAdd }: { initialCityName?: string; onAdd: (c: CityData) => void }) {
  const { pop } = useNavigation();
  const [cityName, setCityName] = useState(initialCityName ?? "");

  const citiesLookup = useMemo(() => {
    const cities = findFromCityStateProvince(cityName);
    cities.sort((a, b) => (a.pop < b.pop ? 1 : -1));
    return cities;
  }, [cityName]);

  return (
    <List
      filtering={false}
      searchText={cityName}
      onSearchTextChange={setCityName}
      navigationTitle="Add a city"
      searchBarPlaceholder="Enter city name"
    >
      {citiesLookup.map((city, i) => (
        <List.Item
          key={i}
          title={city.city + ", " + city.country}
          actions={
            <ActionPanel>
              <Action
                title="Add"
                shortcut={{
                  modifiers: [],
                  key: "enter",
                }}
                onAction={() => {
                  onAdd(city);
                  pop();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [cities, setCities] = useState<CityData[]>([]);
  const [offsetHrs, setOffsetHrs] = useState(0);
  const [, _forceUpdate] = useState({});
  const forceUpdate = () => _forceUpdate({});

  useEffect(() => {
    (async () => {
      const _cities = await getJSON("cities");
      setCities(_cities ?? []);
    })();
  }, []);

  useEffect(() => {
    const intervalId = setInterval(forceUpdate, 1000);
    return () => clearInterval(intervalId);
  }, []);

  const addCityAction = (
    <Action.Push
      icon={Icon.Building}
      title="Add a city"
      shortcut={{
        modifiers: ["cmd", "shift"],
        key: "=",
      }}
      target={
        <AddCityView
          initialCityName={searchText}
          onAdd={(c) => {
            const _cities = sortCitiesByTimeZone(cities.concat(c));
            setCities(_cities);
            setJSON("cities", _cities);
          }}
        />
      }
    />
  );

  const actions = ({ time, city }: { time: string; city?: CityData }) => (
    <ActionPanel>
      <Action
        icon={Icon.CopyClipboard}
        title="Copy time"
        shortcut={{
          modifiers: [],
          key: "enter",
        }}
        onAction={() => {
          Clipboard.copy(time);
          closeMainWindow();
        }}
      />
      <Action
        icon={Icon.Plus}
        title="Add 1 hour"
        shortcut={{
          modifiers: ["cmd"],
          key: "arrowRight",
        }}
        onAction={() => setOffsetHrs((o) => o + 1)}
      />
      <Action
        icon={Icon.Minus}
        title="Subtract 1 hour"
        shortcut={{
          modifiers: ["cmd"],
          key: "arrowLeft",
        }}
        onAction={() => setOffsetHrs((o) => o - 1)}
      />
      <Action
        icon={Icon.Clock}
        title="Clear hours offset"
        shortcut={{
          modifiers: ["cmd"],
          key: "0",
        }}
        onAction={() => setOffsetHrs(() => 0)}
      />
      {addCityAction}
      {city ? (
        <Action
          icon={Icon.XMarkCircle}
          title="Remove city"
          style={Action.Style.Destructive}
          shortcut={{
            modifiers: ["cmd"],
            key: "delete",
          }}
          onAction={() => {
            const _cities = cities.filter((_city) => _city !== city);
            setCities(_cities);
            setJSON("cities", _cities);
          }}
        />
      ) : null}
    </ActionPanel>
  );

  const localDate = new Date();
  localDate.setTime(localDate.getTime() + offsetHrs * 60 * 60 * 1000);
  const localTime = timeFormatter.format(localDate);
  const localDateString = dateFormatter.format(localDate);
  const todayDateString = dateFormatter.format(new Date());

  const subtitle = localTime + " " + (offsetHrs && localDateString !== todayDateString ? localDateString : "");

  const local = (
    <List.Item
      key={"."}
      title={"Local time"}
      subtitle={subtitle}
      icon={getIconForTime(localDate)}
      actions={actions({ time: localTime })}
    />
  );

  return (
    <List filtering searchBarPlaceholder="Search cities" onSearchTextChange={setSearchText}>
      <List.EmptyView
        icon={Icon.Globe}
        title="Add a city"
        actions={<ActionPanel>{addCityAction}</ActionPanel>}
      ></List.EmptyView>
      {local}
      {cities.map((c) => {
        const _date = new Date();
        _date.setTime(_date.getTime() + offsetHrs * 60 * 60 * 1000);
        const date = new Date(_date.toLocaleString("en-US", { timeZone: c.timezone }));
        const timeString = timeFormatter.format(date);
        const dateString = dateFormatter.format(date);
        const subtitle = `${timeString} ${todayDateString === dateString ? "" : dateString}`;

        return (
          <List.Item
            key={c.city}
            title={c.city}
            subtitle={subtitle}
            icon={getIconForTime(date)}
            actions={actions({ time: subtitle, city: c })}
          />
        );
      })}
    </List>
  );
}

function getIconForTime(date: Date) {
  const h = date.getHours();

  const morning = 6;
  const day = 10;
  const evening = 18;
  const night = 29;

  if (h >= morning && h < day) {
    return "icon-morning.png";
  }

  if (h >= day && h < evening) {
    return "icon-day.png";
  }

  if (h >= evening && h < night) {
    return "icon-evening.png";
  }

  return "icon-night.png";
}

function sortCitiesByTimeZone(cities: CityData[]) {
  return [...cities].sort((a, b) => {
    const aDate = new Date(new Date().toLocaleString("en-US", { timeZone: a.timezone }));
    const bDate = new Date(new Date().toLocaleString("en-US", { timeZone: b.timezone }));

    return aDate.getTime() - bDate.getTime();
  });
}

async function getJSON(k: string) {
  const x = await LocalStorage.getItem(k);
  if (!x || typeof x !== "string") return;
  const r = JSON.parse(x);
  return r;
}

async function setJSON(k: string, v: any) {
  await LocalStorage.setItem(k, JSON.stringify(v));
}
