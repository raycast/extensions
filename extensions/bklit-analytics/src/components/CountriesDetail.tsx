import { List, Color, environment } from "@raycast/api";
import { TopCountryData } from "../types";
import { formatNumberLong } from "../utils/formatters";
import { getCountryFlag } from "../utils/country-flags";
import { generateBarChartUrl } from "../utils/charts";

interface CountriesDetailProps {
  data?: TopCountryData[];
  isLoading: boolean;
}

export function CountriesDetail({ data, isLoading }: CountriesDetailProps) {
  // Show loading message if we're loading AND don't have cached data yet (first run)
  if (isLoading && (!data || data.length === 0)) {
    return <List.Item.Detail markdown="Loading countries data..." />;
  }

  if (!data || data.length === 0) {
    return <List.Item.Detail markdown="No countries data available" />;
  }

  // If we have data but are loading (refreshing), show spinner
  const isRefreshing = isLoading && data && data.length > 0;

  const countryChartUrl = generateBarChartUrl(
    data.map((c) => c?.country ?? "").filter(Boolean),
    data.map((c) => c?.views ?? 0),
    environment.appearance,
  );

  return (
    <List.Item.Detail
      isLoading={isRefreshing}
      markdown={`<img src="${countryChartUrl}" alt="Top Countries" />`}
      metadata={
        <List.Item.Detail.Metadata>
          {data.map((country, index) => {
            if (!country || !country.countryCode) return null;
            return (
              <List.Item.Detail.Metadata.TagList
                key={country.countryCode}
                title={`${index + 1} → ${country.country ?? "Unknown"}`}
              >
                <List.Item.Detail.Metadata.TagList.Item
                  key={`${country.countryCode}-flag`}
                  color={index === 0 ? Color.Green : undefined}
                  icon={getCountryFlag(country.countryCode)}
                />
                <List.Item.Detail.Metadata.TagList.Item
                  key={`${country.countryCode}-visitors`}
                  text={`${formatNumberLong(country.uniqueVisitors ?? 0)} visitors`}
                  color={index === 0 ? Color.Green : undefined}
                />
              </List.Item.Detail.Metadata.TagList>
            );
          })}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
