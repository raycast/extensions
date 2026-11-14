import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { startOfDay, endOfDay, endOfYear, addMonths, addYears, isBefore, isAfter } from "date-fns";
import { getHolidays } from "./api";
import { buildMarkdown } from "./holiday-markdown";

export type DateRange = "next_1_month" | "next_3_months" | "next_6_months" | "this_year" | "next_year";

export const CountryDetail = ({ countryCode, dateRange }: { countryCode: string; dateRange?: DateRange }) => {
  const { data, error, isLoading } = usePromise((code: string) => getHolidays(code), [countryCode]);

  if (error) {
    return <List.Item.Detail markdown={"No upcoming holidays known"} />;
  } else if (!isLoading && data?.length === 0) {
    return <List.Item.Detail markdown={"No upcoming holidays known"} />;
  } else {
    const start = startOfDay(new Date());
    let end = endOfDay(addMonths(new Date(), 3));
    switch (dateRange) {
      case "next_1_month":
        end = endOfDay(addMonths(new Date(), 1));
        break;
      case "next_3_months":
        end = endOfDay(addMonths(new Date(), 3));
        break;
      case "next_6_months":
        end = endOfDay(addMonths(new Date(), 6));
        break;
      case "this_year":
        end = endOfYear(new Date());
        break;
      case "next_year":
        end = endOfYear(addYears(new Date(), 1));
        break;
      default:
        break;
    }

    const filtered = data?.filter((h) => {
      const d = h.date as Date;
      // inclusive between start and end
      return !isBefore(d, start) && !isAfter(d, end);
    });

    if (!isLoading && (!filtered || filtered.length === 0)) {
      return <List.Item.Detail markdown={"No upcoming holidays known"} />;
    }

    return <List.Item.Detail isLoading={isLoading} markdown={buildMarkdown(filtered)} />;
  }
};

export interface Country {
  name: string;
  alpha2: string;
  emoji: string;
  alpha3?: string;
  numeric?: string;
  locales?: string[];
  default_locale?: string;
  currency?: string;
  currency_name?: string;
  languages?: string[];
  capital?: string;
  emojiU?: string;
  fips?: string;
  internet?: string;
  continent?: string;
  region?: string;
  alternate_names?: string[];
}
