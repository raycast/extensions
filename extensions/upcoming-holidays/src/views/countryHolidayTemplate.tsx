import { HolidayTypeFilter } from "../types";
import { List } from "@raycast/api";
import Holidays, { HolidaysTypes } from "date-holidays";
import { buildMarkdown } from "../services/buildMarkdown";
import { showFailureToast } from "@raycast/utils";

interface CountryHolidaysTemplateProps {
  countryCode: string;
  stateCode?: string;
  filter?: HolidayTypeFilter;
  dateFilter?: (holidayDate: Date) => boolean;
  opts?: { reverse?: boolean; relativeOrdering?: boolean };
}

export const CountryHolidaysTemplate = ({
  countryCode,
  stateCode,
  filter,
  dateFilter,
  opts,
}: CountryHolidaysTemplateProps) => {
  try {
    const languages = new Holidays(countryCode).getLanguages();

    // Create a Holidays instance for the country and state (if provided)
    const holidayFetcher = stateCode
      ? new Holidays(countryCode, stateCode, {
          types: filter ? [filter as HolidaysTypes.HolidayType] : [],
        })
      : new Holidays(countryCode, {
          types: filter ? [filter as HolidaysTypes.HolidayType] : [],
        });

    const nativeHoliday = holidayFetcher.getHolidays(new Date().getFullYear(), languages[0]);
    const englishHoliday = holidayFetcher.getHolidays(new Date().getFullYear(), "en");

    if (!nativeHoliday || nativeHoliday.length === 0) {
      return <List.Item.Detail markdown={"### No holidays known matching criteria."} />;
    } else {
      const effectiveDateFilter = dateFilter || (() => true);

      const filteredHolidays = nativeHoliday.filter((native) => {
        const holidayDate = new Date(native.start);
        return effectiveDateFilter(holidayDate);
      });

      const translatedHolidays = filteredHolidays.map((native) => {
        const english = englishHoliday.find((eng) => eng.date === native.date);
        if (english && native.name !== english.name) {
          return { ...native, englishName: english.name };
        }
        return native;
      });

      const reverse = opts?.reverse ?? false;
      const relative = opts?.relativeOrdering ?? false;

      if (translatedHolidays.length === 0) {
        return <List.Item.Detail markdown={"### No holidays known matching criteria."} />;
      }
      return (
        <List.Item.Detail
          markdown={buildMarkdown(translatedHolidays, { reverse: reverse, relativeOrdering: relative })}
        />
      );
    }
  } catch (error) {
    showFailureToast(error, { title: "Error fetching holidays" });
    return <List.Item.Detail markdown={"An error occurred while fetching holidays."} />;
  }
};
