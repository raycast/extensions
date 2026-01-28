import { List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import {
  format,
  formatDistanceToNow,
  startOfDay,
  endOfDay,
  endOfYear,
  addMonths,
  addYears,
  isBefore,
  isAfter,
} from "date-fns";
import { Holiday } from "./api";

export type DateRange = "next_1_month" | "next_3_months" | "next_6_months" | "this_year" | "next_year";

const buildMarkdown = (holidays: Holiday[] | undefined) => {
  if (!holidays || holidays.length === 0) return "";

  const parts = holidays.map((holiday) => {
    const { date, name } = holiday;
    // Avoid leading indentation so markdown doesn't render as a code block
    return `### ${name}\n\n${format(date, "EEEE, MMMM do")} (${formatDistanceToNow(date, {
      addSuffix: true,
    })})`;
  });

  return parts.join("\n\n");
};

export const CountryDetail = ({ countryCode, dateRange }: { countryCode: string; dateRange?: DateRange }) => {
  const { data, error, isLoading } = useFetch(
    `https://askholidays.vercel.app/api/holiday-country?country=${countryCode}`,
    {
      parseResponse: async (response: Response) => {
        // Be resilient to empty or non-JSON responses to avoid JSON.parse errors
        if (!response.ok) return [];

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          // Try to read text; if empty return empty array
          const text = await response.text();
          if (!text) return [];
          try {
            const holidays = JSON.parse(text) as Holiday[];
            return holidays.map((holiday) => ({ ...holiday, date: new Date(holiday.date) }));
          } catch {
            return [];
          }
        }

        try {
          const holidays = (await response.json()) as Holiday[];
          return holidays.map((holiday) => ({ ...holiday, date: new Date(holiday.date) }));
        } catch {
          return [];
        }
      },
    },
  );

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
  alpha3: string;
  numeric: string;
  locales: string[];
  default_locale: string;
  currency: string;
  currency_name: string;
  languages: string[];
  capital: string;
  emoji: string;
  emojiU: string;
  fips: string;
  internet: string;
  continent: string;
  region: string;
  alternate_names?: string[];
}
