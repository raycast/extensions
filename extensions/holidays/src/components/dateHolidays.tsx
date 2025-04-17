import { List } from "@raycast/api";
import Holidays from "date-holidays";
import moment from "moment";
import { useEffect, useState } from "react";
import { getAllCountries } from "country-locale-map";
import { TranslatedHoliday, HolidayTypeFilter } from "../types";
import { buildMarkdown } from "../services/buildMarkdown";

export default function DateHoliday({ selectedDate }: { selectedDate: moment.Moment }) {
  const [isLoading, setIsLoading] = useState(true);
  const [holidaysFound, setHolidaysFound] = useState<
    Record<string, { country: TranslatedHoliday[]; states: Record<string, TranslatedHoliday[]> }>
  >({});
  const [state, setState] = useState<{ filter: HolidayTypeFilter | undefined; searchText: string }>({
    filter: undefined,
    searchText: "",
  });

  useEffect(() => {
    const loadCountriesAndCheckHolidays = async () => {
      setIsLoading(true);
      const countries = getAllCountries();
      const dateToCheck = selectedDate.toDate();
      const allHolidays: Record<string, { country: TranslatedHoliday[]; states: Record<string, TranslatedHoliday[]> }> =
        {};

      for (const country of countries) {
        const hd = new Holidays(country.alpha2);

        // Check country-level holidays
        const nativeHolidays = hd.isHoliday(dateToCheck);

        if (nativeHolidays) {
          const englishHolidays = hd.getHolidays(selectedDate.year(), "en");

          const countryHolidays = nativeHolidays.map((native) => {
            const english = englishHolidays.find((eng) => eng.date === native.date);
            return english && native.name !== english.name ? { ...native, englishName: english.name } : native;
          });

          if (countryHolidays.length > 0) {
            allHolidays[country.alpha2] = { country: countryHolidays, states: {} };
          }
        }

        // Check state-level holidays
        const states = hd.getStates(country.alpha2);
        if (states) {
          for (const stateCode of Object.keys(states)) {
            const stateHd = new Holidays(country.alpha2, stateCode);
            const nativeStateHolidays = stateHd.isHoliday(dateToCheck);

            if (nativeStateHolidays) {
              const englishStateHolidays = stateHd.getHolidays(selectedDate.year(), "en");

              const stateHolidays = nativeStateHolidays.map((native) => {
                const english = englishStateHolidays.find((e) => e.date === native.date);
                return english && native.name !== english.name ? { ...native, englishName: english.name } : native;
              });

              if (stateHolidays.length > 0) {
                if (!allHolidays[country.alpha2]) {
                  allHolidays[country.alpha2] = { country: [], states: {} };
                }
                allHolidays[country.alpha2].states[stateCode] = stateHolidays;
              }
            }
          }
        }
      }

      setHolidaysFound(allHolidays);
      setIsLoading(false);
    };

    loadCountriesAndCheckHolidays();
  }, [selectedDate]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search for a location..."
      isShowingDetail={true}
      searchText={state.searchText}
      onSearchTextChange={(newValue) => {
        setState((previous) => ({ ...previous, searchText: newValue }));
      }}
      filtering={true}
    >
      {Object.entries(holidaysFound).flatMap(([countryCode, { country: countryHolidays, states: stateHolidays }]) => {
        const country = getAllCountries().find((c) => c.alpha2 === countryCode);
        const stateNames = new Holidays(countryCode).getStates(countryCode);

        const countryItems =
          countryHolidays?.length > 0 ? (
            <List.Item
              key={`${countryCode}-country`}
              title={`${country?.name}`}
              icon={country?.emoji || ""}
              detail={
                <List.Item.Detail markdown={buildMarkdown(countryHolidays, { startDate: true, relativeDate: false })} />
              }
            />
          ) : null;

        const stateItems = Object.entries(stateHolidays || {}).map(([stateCode, holidays]) => {
          const stateName = stateNames[stateCode];
          return holidays.length > 0 ? (
            <List.Item
              key={`${countryCode}-${stateCode}`}
              title={`${stateName}`}
              icon={country?.emoji}
              accessories={[{ text: `${country?.alpha3}`, tooltip: `${country?.name}` }]}
              detail={<List.Item.Detail markdown={buildMarkdown(holidays, { startDate: true, relativeDate: false })} />}
            />
          ) : null;
        });

        return [countryItems, ...stateItems];
      })}
    </List>
  );
}
