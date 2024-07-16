import { List, Icon, Detail, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import FathomRequest from "./utils/api";
import PeriodDropdown from "./components/PeriodDropdown";
import { Country } from "./types/Country";
import { countryMapping } from "./countryMapping";

function countryCodeToFlagEmoji(countryCode: string) {
  const offset = 127397; // Unicode offset to convert ASCII to Regional Indicator Symbol
  return countryCode
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(char.charCodeAt(0) + offset))
    .join("");
}

export default function Command() {
  const [dateFrom, setDateFrom] = useState<string>("");

  const { data, isLoading, error } = FathomRequest({
    endpoint: "/aggregations",
    entity: "pageview",
    aggregates: "pageviews",
    groupBy: "country_code",
    sortBy: "pageviews:desc",
    dateFrom: dateFrom,
  }) as {
    data: Country[] | undefined;
    isLoading: boolean;
    error: { title: string; message: string; markdown: string } | undefined;
  };

  if (data) {
    const totalPageviews = data?.reduce((total, page) => total + parseInt(page.pageviews), 0) || 0;

    return (
      <List
        isLoading={isLoading}
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
                  text: `${country.pageviews.toLocaleString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} (${relativePageviews}%)`,
                },
                { icon: Icon.TwoPeople },
              ]}
            />
          );
        })}
      </List>
    );
  } else if (error) {
    if (error.title != "") {
      showToast({
        style: Toast.Style.Failure,
        title: error.title,
        message: error.message,
      });

      return <Detail markdown={error.markdown} />;
    }
  }
}
