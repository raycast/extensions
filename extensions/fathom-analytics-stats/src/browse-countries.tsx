import { getPreferenceValues, List, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import PeriodDropdown from "./components/PeriodDropdown";
import { countryMapping } from "./countryMapping";

interface Preferences {
  apiToken: string;
  siteId: string;
}

type Referrer = {
  pageviews: string;
  country_code: string;
};

type Data = Referrer[];

function countryCodeToFlagEmoji(countryCode: string) {
  const offset = 127397; // Unicode offset to convert ASCII to Regional Indicator Symbol
  return countryCode
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(char.charCodeAt(0) + offset))
    .join("");
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [dateFrom, setDateFrom] = useState<string>("");

  const { data, isLoading } = useFetch<Data>(
    `https://api.usefathom.com/v1/aggregations?entity_id=${
      preferences.siteId
    }&entity=pageview&aggregates=pageviews&field_grouping=country_code&sort_by=pageviews:desc${dateFrom ? `&date_from=${dateFrom}` : ""}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${preferences.apiToken}`,
      },
    },
  );

  const totalPageviews = data?.reduce((total, page) => total + parseInt(page.pageviews), 0) || 0;

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Choose a time period"
      searchBarPlaceholder="Search countries"
      searchBarAccessory={<PeriodDropdown setDateFrom={setDateFrom} />}
    >
      {data?.map((country) => {
        const relativePageviews = ((parseInt(country.pageviews) / totalPageviews) * 100).toFixed(1);
        return (
          <List.Item
            key={country.country_code}
            title={`${countryCodeToFlagEmoji(country.country_code)} ${countryMapping[country.country_code] || country.country_code}`}
            accessories={[
              {
                text: `${country.pageviews.toLocaleString()} (${relativePageviews}%)`,
              },
              { icon: Icon.TwoPeople },
            ]}
          />
        );
      })}
    </List>
  );
}
