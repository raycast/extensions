import { List } from "@raycast/api";
import moment from "moment";
import useSWR from "swr";
import { fetcher, Holiday } from "./api";

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

export const CountryDetail = ({ countryCode }: { countryCode: string }) => {
  const { data, error } = useSWR(countryCode, fetcher);

  if (error || data?.length === 0) {
    return <List.Item.Detail markdown={"No upcoming holidays known"} />;
  } else {
    return <List.Item.Detail isLoading={!data} markdown={buildMarkdown(data)} />;
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
