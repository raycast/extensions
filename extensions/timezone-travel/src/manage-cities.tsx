import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_CITIES,
  addCity,
  formatTimeZoneIdentifier,
  getCityCatalog,
  getCityKey,
  makeAnchor,
  removeCity,
} from "./cities";
import { loadCities, saveCities } from "./city-storage";
import type { City } from "./cities";

interface ManageCitiesProps {
  onChange?: (cities: City[]) => void;
  navigationTitle?: string;
}

interface AddCityPickerProps {
  cities: City[];
  isSaving: boolean;
  onAdd: (city: City) => Promise<boolean>;
}

function AddCityPicker({ cities, isSaving, onAdd }: AddCityPickerProps) {
  const [query, setQuery] = useState("");
  const { pop } = useNavigation();
  const selectedCities = useMemo(() => new Set(cities.map(getCityKey)), [cities]);
  const availableCities = useMemo(
    () => getCityCatalog().filter((option) => !selectedCities.has(getCityKey(option))),
    [selectedCities],
  );

  const add = useCallback(
    async (city: City) => {
      if (await onAdd(city)) pop();
    },
    [onAdd, pop],
  );

  return (
    <List
      filtering
      isLoading={isSaving}
      navigationTitle="Add a City"
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="City, country, or time zone…"
    >
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title={query.trim() ? "No Matching City" : "Search for a City"}
        description={
          query.trim()
            ? "Try a nearby city or its time-zone name."
            : "Try Tokyo, Poland, Pacific Time, or Europe/London."
        }
      />
      {query.trim() ? (
        <List.Section title="Results">
          {availableCities.map((city) => (
            <List.Item
              key={getCityKey(city)}
              icon={Icon.PlusCircle}
              title={city.label}
              subtitle={formatTimeZoneIdentifier(city.timeZone)}
              keywords={city.keywords}
              actions={
                <ActionPanel>
                  <Action title={`Add ${city.label}`} icon={Icon.PlusCircle} onAction={() => add(city)} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

export function ManageCities({ onChange, navigationTitle }: ManageCitiesProps) {
  const [cities, setCities] = useState<City[]>(DEFAULT_CITIES);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const isPersisting = useRef(false);

  useEffect(() => {
    let isActive = true;
    loadCities()
      .then((storedCities) => {
        if (isActive) setCities(storedCities);
      })
      .catch(() => showToast(Toast.Style.Failure, "Could not load your cities"))
      .finally(() => {
        if (isActive) setIsLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, []);

  const persist = useCallback(
    async (nextCities: City[], successTitle: string): Promise<boolean> => {
      if (isPersisting.current) {
        await showToast(Toast.Style.Failure, "Another city change is still being saved");
        return false;
      }

      isPersisting.current = true;
      setIsSaving(true);
      const previousCities = cities;
      setCities(nextCities);
      onChange?.(nextCities);

      try {
        await saveCities(nextCities);
        await showToast(Toast.Style.Success, successTitle);
        return true;
      } catch {
        setCities(previousCities);
        onChange?.(previousCities);
        await showToast(Toast.Style.Failure, "Could not save that change");
        return false;
      } finally {
        isPersisting.current = false;
        setIsSaving(false);
      }
    },
    [cities, onChange],
  );

  const remove = useCallback(
    async (city: City) => {
      const nextCities = removeCity(cities, city);
      if (nextCities === cities) {
        await showToast(Toast.Style.Failure, "Keep at least one city");
        return;
      }

      const nextAnchor = nextCities[0];
      const confirmed = await confirmAlert({
        icon: Icon.XMarkCircle,
        title: `Remove ${city.label}?`,
        message:
          getCityKey(cities[0]) === getCityKey(city)
            ? `${city.label} will be removed. ${nextAnchor.label} will become the city used for entered times.`
            : `${city.label} will be removed from your world clock.`,
        primaryAction: {
          title: "Remove City",
          style: Alert.ActionStyle.Destructive,
        },
      });
      if (!confirmed) return;

      await persist(nextCities, `Removed ${city.label}`);
    },
    [cities, persist],
  );

  if (isLoading) {
    return <List isLoading navigationTitle={navigationTitle} searchBarPlaceholder="Loading cities…" />;
  }

  const addCityPicker = (
    <AddCityPicker
      cities={cities}
      isSaving={isSaving}
      onAdd={(city) => persist(addCity(cities, city), `Added ${city.label}`)}
    />
  );

  return (
    <List isLoading={isSaving} navigationTitle={navigationTitle} searchBarPlaceholder="Filter your cities…">
      <List.Section title="Your Cities" subtitle={`Times you enter use ${cities[0].label}`}>
        {cities.map((city, index) => (
          <List.Item
            key={getCityKey(city)}
            icon={index === 0 ? Icon.StarCircle : Icon.CheckCircle}
            title={city.label}
            subtitle={formatTimeZoneIdentifier(city.timeZone)}
            accessories={index === 0 ? [{ tag: { value: "Anchor", color: Color.Blue } }] : []}
            actions={
              <ActionPanel>
                {index > 0 ? (
                  <Action
                    title={`Use ${city.label} for Entered Times`}
                    icon={Icon.StarCircle}
                    shortcut={{
                      macOS: { modifiers: ["cmd", "shift"], key: "enter" },
                      Windows: { modifiers: ["ctrl", "shift"], key: "enter" },
                    }}
                    onAction={() => persist(makeAnchor(cities, city), `${city.label} now sets entered times`)}
                  />
                ) : (
                  <Action.Push title="Add a City" icon={Icon.PlusCircle} target={addCityPicker} />
                )}
                <ActionPanel.Section>
                  {index > 0 ? <Action.Push title="Add a City" icon={Icon.PlusCircle} target={addCityPicker} /> : null}
                  <Action
                    title={`Remove ${city.label}`}
                    icon={Icon.XMarkCircle}
                    style={Action.Style.Destructive}
                    onAction={() => remove(city)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Add">
        <List.Item
          icon={Icon.PlusCircle}
          title="Add a City…"
          subtitle="Search by city, country, or time zone"
          actions={
            <ActionPanel>
              <Action.Push title="Search Cities" icon={Icon.MagnifyingGlass} target={addCityPicker} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

export default function Command() {
  return <ManageCities />;
}
