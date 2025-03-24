import { Action, ActionPanel, Color, Icon, List, LocalStorage, showToast, Toast } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import fetch from "node-fetch";
import { getLocation, locations } from "./locations";
import { handlePin, usePinned } from "./pin";
import { Day, DayDict, Location, Pollenflug, PollenflugApiData, PollenflugItem } from "./types";
import { getEnglishName } from "./pollen-names";

function getPollenDisplay(value: string): { color: Color; value: string } {
  switch (value) {
    case "0":
      return { color: Color.Green, value: "None" };
    case "0-1":
      return { color: Color.Green, value: "None to Low" };
    case "1":
      return { color: Color.Yellow, value: "Low" };
    case "1-2":
      return { color: Color.Yellow, value: "Low to Medium" };
    case "2":
      return { color: Color.Orange, value: "Medium" };
    case "2-3":
      return { color: Color.Red, value: "Medium to High" };
    case "3":
      return { color: Color.Red, value: "High" };
    default:
      console.log("Unknown value:", value);
      return { color: Color.SecondaryText, value: "Unknown Value" };
  }
}

async function fetchPollenflugData(): Promise<PollenflugApiData | null> {
  const response = await fetch("https://opendata.dwd.de/climate_environment/health/alerts/s31fg.json");
  const result: PollenflugApiData = (await response.json()) as PollenflugApiData;
  LocalStorage.setItem("pollenflug_data", JSON.stringify(result));
  LocalStorage.setItem("pollenflug_data_last_update", new Date().toISOString());
  return result;
}

function usePollenflug(location: Location): {
  pollenflug?: Pollenflug;
  isLoading: boolean;
  revalidate: () => Promise<PollenflugApiData | null>;
} {
  const { data, isLoading, revalidate } = usePromise(async () => {
    const cached = await LocalStorage.getItem("pollenflug_data").then((value) =>
      value ? (JSON.parse(value?.toString()) as PollenflugApiData) : null,
    );
    const lastUpdate = await LocalStorage.getItem("pollenflug_data_last_update").then((value) =>
      value ? new Date(value?.toString()) : null,
    );
    const nextUpdate = cached ? new Date(cached.next_update.replace(" Uhr", "")) : null;

    if (cached && lastUpdate && nextUpdate && new Date() < nextUpdate) {
      showToast({
        style: Toast.Style.Success,
        title: "Loaded from cache",
        message: `Next update: ${nextUpdate.toLocaleString()}`,
      });
      return cached;
    } else {
      showToast({
        style: Toast.Style.Animated,
        title: "Fetching data",
      });
      const result = await fetchPollenflugData();
      showToast({
        style: Toast.Style.Success,
        title: "Data fetched",
      });
      return result;
    }
  }, []);

  const content = data?.content.find((item) => item.partregion_id === location.partregion_id);
  if (!content) {
    return { pollenflug: undefined, isLoading, revalidate };
  }

  // include key in the object
  const pollen = Object.entries(content.Pollen).map(([name, values]) => ({ name, ...values }));

  return { pollenflug: { location, pollen }, isLoading, revalidate };
}

export default function Command() {
  const [location, setLocation] = useCachedState<Location>("location", locations[0]);

  const [day, setDay] = useCachedState<Day>("day", "today");

  const { pollenflug, isLoading, revalidate } = usePollenflug(location);

  const { pinnedItems, unpinnedItems, hasPinned, setPinned } = usePinned(pollenflug);

  const actions = (
    <>
      <ActionPanel.Section title="Day">
        <Action
          title={DayDict["today"]}
          icon={Icon.Sun}
          shortcut={{ modifiers: ["cmd"], key: "1" }}
          onAction={() => setDay("today")}
        />
        <Action
          title={DayDict["tomorrow"]}
          icon={Icon.Sun}
          shortcut={{ modifiers: ["cmd"], key: "2" }}
          onAction={() => setDay("tomorrow")}
        />
        <Action
          title={DayDict["dayafter_to"]}
          icon={Icon.Sun}
          shortcut={{ modifiers: ["cmd"], key: "3" }}
          onAction={() => setDay("dayafter_to")}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title={`Revalidate`}
          icon={Icon.ArrowClockwise}
          onAction={() => revalidate()}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
        />
      </ActionPanel.Section>
    </>
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Pollenflug ${DayDict[day]}`}
      searchBarAccessory={<LocationDropdown onChange={(id: string) => setLocation(getLocation(id) ?? locations[0])} />}
    >
      {hasPinned && (
        <List.Section title="Pinned">
          {pinnedItems.map((item) => (
            <PollenflugListItem
              key={item.name}
              item={item}
              day={day}
              isPinned={true}
              setPinned={setPinned}
              actions={actions}
            />
          ))}
        </List.Section>
      )}
      <List.Section title={hasPinned ? "Other" : undefined}>
        {unpinnedItems.map((item) => (
          <PollenflugListItem
            key={item.name}
            item={item}
            day={day}
            isPinned={false}
            setPinned={setPinned}
            actions={actions}
          />
        ))}
      </List.Section>
    </List>
  );
}

function PollenflugListItem({
  item,
  day,
  isPinned,
  setPinned,
  actions,
}: {
  item: PollenflugItem;
  day: Day;
  isPinned: boolean;
  setPinned: (pinned: string[]) => void;
  actions: JSX.Element;
}) {
  return (
    <List.Item
      key={item.name}
      title={getEnglishName(item.name)}
      accessories={[{ tag: getPollenDisplay(item[day]) }, {}]}
      actions={
        <ActionPanel>
          <Action
            title={`${isPinned ? "Unpin" : "Pin"} ${getEnglishName(item.name)}`}
            icon={Icon.Pin}
            onAction={() => handlePin(item.name).then((pinned) => setPinned(pinned))}
          />
          {actions}
        </ActionPanel>
      }
    />
  );
}

function LocationDropdown({ onChange }: { onChange: (id: string) => void }) {
  return (
    <List.Dropdown tooltip="Select region" storeValue onChange={(newValue) => onChange(newValue)}>
      {locations.map((location) => (
        <List.Dropdown.Item
          key={`${location.region_id}+${location.partregion_id}`}
          value={`${location.region_id}:${location.partregion_id}`}
          title={
            location.partregion_name.length > 0
              ? location.partregion_name + ` (${location.region_name})`
              : location.region_name
          }
        />
      ))}
    </List.Dropdown>
  );
}
