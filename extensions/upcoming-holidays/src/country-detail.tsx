import { List } from "@raycast/api";
import moment from "moment";
import { useFetch } from "@raycast/utils";
import { Holiday } from "./api";

export type DateRange = "next_1_month" | "next_3_months" | "next_6_months" | "this_year" | "next_year";

const buildMarkdown = (holidays: Holiday[] | undefined) => {
  const markdown = holidays
    ?.map((holiday) => {
      const { date, name } = holiday;
      return `
### ${name}

${moment(date).format("dddd, MMMM Do")} (${moment(date).fromNow()})

`;
    })
    .join("\n\n");
  return markdown;
};

export const CountryDetail = ({ countryCode, dateRange }: { countryCode: string; dateRange?: DateRange }) => {
  const { data, error, isLoading } = useFetch(
    `https://askholidays.vercel.app/api/holiday-country?country=${countryCode}`,
    {
      parseResponse: async (response: Response) => {
        const holidays = (await response.json()) as Holiday[];
        return holidays.map((holiday) => ({
          ...holiday,
          date: new Date(holiday.date),
        }));
      },
    },
  );

  if (error || data?.length === 0) {
    return <List.Item.Detail markdown={"No upcoming holidays known"} />;
  } else {
    // filter by dateRange if provided
    const start = moment().startOf("day");
    let end = moment().add(3, "months").endOf("day");
    switch (dateRange) {
      case "next_1_month":
        end = moment().add(1, "months").endOf("day");
        break;
      case "next_3_months":
        end = moment().add(3, "months").endOf("day");
        break;
      case "next_6_months":
        end = moment().add(6, "months").endOf("day");
        break;
      case "this_year":
        end = moment().endOf("year");
        break;
      case "next_year":
        end = moment().add(1, "year").endOf("year");
        break;
      default:
        break;
    }

    const filtered = data?.filter((h) => {
      const d = moment(h.date);
      return d.isBetween(start, end, "day", "[]");
    });

    if (!filtered || filtered.length === 0) {
      return <List.Item.Detail markdown={"No upcoming holidays known"} />;
    }

    return <List.Item.Detail isLoading={isLoading} markdown={buildMarkdown(filtered)} />;
  }
};

// Because this is not imported by country-locale-map
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
