import { List, ActionPanel, Action, Icon, Toast, showToast, launchCommand, LaunchType } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { nanoid } from "nanoid";
import { useState, useMemo, useCallback } from "react";
import { CountryData, TimeEntry } from "./types";
import { formatLocalTime, formatLocation, getFlagEmoji } from "./utils";
import worldCitiesTimezones from "./world_cities_timezones.json";

type ViewOption = "all" | "saved" | "available";

const flattenAvailableCities = (): Array<Omit<TimeEntry, "id"> & { state?: string }> => {
  const data = worldCitiesTimezones as CountryData[];

  return data.flatMap((country) => {
    const baseCity = {
      country: country.country,
      isoCode: country.isoCode,
    };

    if (country.states) {
      return country.states.flatMap((state) =>
        state.timeZones.flatMap((tz) =>
          tz.cities.map((cityName) => ({
            ...baseCity,
            city: cityName,
            state: state.state,
            timeZone: tz.zone,
          })),
        ),
      );
    }

    if (country.timeZones) {
      return country.timeZones.flatMap((tz) =>
        tz.cities.map((cityName) => ({
          ...baseCity,
          city: cityName,
          timeZone: tz.zone,
        })),
      );
    }

    return [];
  });
};

const EditTeamTime = () => {
  const {
    value: savedCities,
    setValue: setSavedCities,
    isLoading,
  } = useLocalStorage<TimeEntry[]>("team_time_cities", []);
  const [searchText, setSearchText] = useState("");
  const [viewOption, setViewOption] = useState<ViewOption>("all");

  const availableCities = useMemo(() => flattenAvailableCities(), []);

  const filteredAvailable = useMemo(() => {
    const query = searchText.toLowerCase();
    return availableCities.filter((entry) => {
      return (
        entry.city.toLowerCase().includes(query) ||
        (entry.state?.toLowerCase()?.includes(query) ?? false) ||
        entry.country.toLowerCase().includes(query)
      );
    });
  }, [availableCities, searchText]);

  const handleAddCity = useCallback(
    async (cityData: Omit<TimeEntry, "id"> & { state?: string }) => {
      if (savedCities?.some((entry) => entry.city === cityData.city && entry.timeZone === cityData.timeZone)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Already saved",
          message: `${cityData.city} is already in your list.`,
        });
        return;
      }

      const newEntry: TimeEntry = { id: nanoid(), ...cityData };
      setSavedCities([...(savedCities ?? []), newEntry]);
      await launchCommand({ name: "teamTimeOverview", type: LaunchType.Background });
    },
    [savedCities, setSavedCities],
  );

  const handleRemoveCity = useCallback(
    async (id: string) => {
      const newSavedCities = savedCities?.filter((entry) => entry.id !== id) ?? [];
      await setSavedCities(newSavedCities);
      await launchCommand({ name: "teamTimeOverview", type: LaunchType.Background });
    },
    [savedCities, setSavedCities],
  );

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by city, state, or country..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select View"
          value={viewOption}
          onChange={(newValue) => setViewOption(newValue as ViewOption)}
        >
          <List.Dropdown.Item title="Show All" value="all" />
          <List.Dropdown.Item title="Saved Cities" value="saved" />
          <List.Dropdown.Item title="Available Cities" value="available" />
        </List.Dropdown>
      }
    >
      {/* Section for saved cities */}
      {(viewOption === "all" || viewOption === "saved") && (
        <List.Section title="My Team's Times">
          {(savedCities ?? []).map((entry) => (
            <List.Item
              key={entry.id}
              title={formatLocation(entry)}
              subtitle={formatLocalTime(entry.timeZone)}
              icon={getFlagEmoji(entry.isoCode)}
              actions={
                <ActionPanel>
                  <Action
                    title="Remove City"
                    style={Action.Style.Destructive}
                    icon={Icon.Trash}
                    onAction={() => handleRemoveCity(entry.id)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {/* Section for available cities */}
      {(viewOption === "all" || viewOption === "available") && (
        <List.Section title="Available Cities">
          {filteredAvailable.map((entry, index) => (
            <List.Item
              key={`${entry.city}-${entry.timeZone}-${index}`}
              title={formatLocation(entry)}
              subtitle={`${formatLocalTime(entry.timeZone)} (${entry.timeZone})`}
              icon={getFlagEmoji(entry.isoCode)}
              actions={
                <ActionPanel>
                  <Action title={`Add ${entry.city}`} icon={Icon.PlusCircle} onAction={() => handleAddCity(entry)} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
};

export default EditTeamTime;
