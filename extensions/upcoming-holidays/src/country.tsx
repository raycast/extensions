import { List } from "@raycast/api";
import moment from "moment";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { fetcher, Holiday } from "./api";

const buildMarkdown = (holidays: Holiday[] | null) => {
  if (!holidays) {
    return "";
  }
  if (holidays.length === 0) {
    return "No upcoming holidays known";
  }
  const markdown = holidays
    .map((holiday) => {
      const { date, name } = holiday;
      return `
### ${name}

${moment(date).format("dddd, MMMM Do")} (${moment(date).fromNow()})

`;
    })
    .join("\n\n");
  return markdown;
};

export const CountryDetail = ({ countryCode }: { countryCode: string }) => {
  const [holidays, setHolidays] = useState<Holiday[] | null>(null);
  const { data, error } = useSWR(countryCode, fetcher);

  useEffect(() => {
    if (error) {
      setHolidays([]);
    }
    if (data) {
      setHolidays(data);
    }
  }, [data, error]);

  return <List.Item.Detail isLoading={!holidays} markdown={buildMarkdown(holidays)} />;
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
