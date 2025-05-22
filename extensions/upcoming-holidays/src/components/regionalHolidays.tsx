import { Action, ActionPanel, Icon, List } from "@raycast/api";
import Holidays from "date-holidays";
import { CountryHolidaysTemplate } from "../views/countryHolidayTemplate";
import { Country, HolidayTypeFilter, TranslatedHoliday } from "../types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { loadPinnedStates, pinState, unpinState } from "../services/pinManager";
import { getAllCountries } from "country-locale-map";
import { showFailureToast } from "@raycast/utils";
import { parseISO } from "date-fns";

export const RegionalHolidays = ({
  countryCode,
  dateFilter,
}: {
  countryCode: string;
  dateFilter?: (holidayDate: Date) => boolean;
}) => {
  const country = new Holidays(countryCode);
  const states = country.getStates(countryCode);

  const [isLoading, setIsLoading] = useState(true);
  const [pinnedStates, setPinnedStates] = useState<string[]>([]);
  const [state, setState] = useState<{ filter: HolidayTypeFilter | undefined; searchText: string }>({
    filter: undefined,
    searchText: "",
  });
  const [holidaysByState, setHolidaysByState] = useState<Record<string, TranslatedHoliday[]>>({});

  const fetchStatesAndHolidays = useCallback(async () => {
    setIsLoading(true);
    const pinnedStateCodes = await loadPinnedStates(countryCode);
    setPinnedStates(pinnedStateCodes);

    const languages = country.getLanguages();
    const allHolidaysByState: Record<string, TranslatedHoliday[]> = {};

    for (const [stateCode] of Object.entries(states)) {
      const stateHd = new Holidays(countryCode, stateCode);
      const nativeHolidays = stateHd.getHolidays(new Date().getFullYear(), languages[0]);
      const englishHolidays = stateHd.getHolidays(new Date().getFullYear(), "en");

      const filteredHolidays = nativeHolidays
        .filter((native) => (dateFilter ? dateFilter(parseISO(native.date)) : true))
        .map((native) => {
          const english = englishHolidays.find((eng) => eng.date === native.date);
          return english && native.name !== english.name ? { ...native, englishName: english.name } : native;
        });

      if (filteredHolidays.length > 0) {
        allHolidaysByState[stateCode] = filteredHolidays;
      }
    }

    setHolidaysByState(allHolidaysByState);
    setIsLoading(false);
  }, [countryCode, dateFilter]);

  useEffect(() => {
    fetchStatesAndHolidays();
  }, [fetchStatesAndHolidays]);

  const handlePinState = async (country: Country, stateCode: string, stateName: string) => {
    await pinState(country, stateCode, stateName);
    setPinnedStates((prev) => [...prev, stateCode]);
    setState((previous) => ({ ...previous, searchText: stateName }));
  };

  const handleUnpinState = async (stateCode: string) => {
    await unpinState(countryCode, stateCode);
    setPinnedStates((prev) => prev.filter((code) => code !== stateCode));
    setState((previous) => ({ ...previous, searchText: "" }));
  };

  const unpinnedStates = useMemo(() => {
    return Object.keys(states).filter((stateCode) => !pinnedStates.includes(stateCode));
  }, [states, pinnedStates]);

  const pinnedRegionItems = useMemo(() => {
    return pinnedStates.map((stateCode) => {
      const stateHolidays = holidaysByState[stateCode];
      if (stateHolidays) {
        return (
          <List.Item
            key={stateCode}
            title={states[stateCode]} // State name as the title
            detail={
              <CountryHolidaysTemplate
                filter={state.filter}
                countryCode={countryCode}
                stateCode={stateCode}
                dateFilter={dateFilter}
              />
            }
            accessories={[{ text: `${stateCode}` }]}
            actions={
              <ActionPanel>
                <Action
                  title="Unpin Region"
                  icon={{ source: Icon.TackDisabled }}
                  onAction={async () => {
                    await handleUnpinState(stateCode); // Unpin the state
                  }}
                />
              </ActionPanel>
            }
          />
        );
      }
      return null;
    });
  }, [pinnedStates, holidaysByState, states, state.filter, countryCode, dateFilter]);

  if (Object.keys(holidaysByState).length === 0) {
    return (
      <List>
        <List.Item title="No upcoming holidays known" />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={true}
      searchBarPlaceholder="Search for a region..."
      searchText={state.searchText}
      onSearchTextChange={(newValue) => {
        setState((previous) => ({ ...previous, searchText: newValue }));
      }}
      filtering={true}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Holiday Type"
          value={state.filter}
          onChange={(newValue) => setState((previous) => ({ ...previous, filter: newValue as HolidayTypeFilter }))}
        >
          <List.Dropdown.Item title="All" value={""} />
          <List.Dropdown.Item title="Public" value={HolidayTypeFilter.Public} />
          <List.Dropdown.Item title="Bank" value={HolidayTypeFilter.Bank} />
          <List.Dropdown.Item title="Optional" value={HolidayTypeFilter.Optional} />
          <List.Dropdown.Item title="School" value={HolidayTypeFilter.School} />
          <List.Dropdown.Item title="Observance" value={HolidayTypeFilter.Observance} />
        </List.Dropdown>
      }
    >
      <List.Section title="Pinned Regions">{pinnedRegionItems}</List.Section>
      <List.Section title="Unpinned Regions">
        {unpinnedStates.map((stateCode) => {
          return (
            <List.Item
              key={stateCode}
              title={states[stateCode]} // State name as the title
              detail={
                <CountryHolidaysTemplate
                  filter={state.filter}
                  countryCode={countryCode}
                  stateCode={stateCode}
                  dateFilter={dateFilter}
                />
              }
              accessories={[{ text: `${stateCode}` }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Pin Region"
                    icon={{ source: Icon.Tack }}
                    onAction={async () => {
                      const countryInfo = getAllCountries().find((c) => c.alpha2 === countryCode);
                      if (countryInfo) {
                        await handlePinState(countryInfo, stateCode, states[stateCode]);
                      } else {
                        showFailureToast("Failed to pin region", {
                          message: `Country with code ${countryCode} not found.`,
                        });
                      }
                    }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
};
