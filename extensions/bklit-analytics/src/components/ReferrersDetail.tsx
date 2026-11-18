import { List, Color, environment } from "@raycast/api";
import { ReferrerData } from "../types";
import { formatNumberLong } from "../utils/formatters";
import { generateBarChartUrl } from "../utils/charts";

interface ReferrersDetailProps {
  data?: ReferrerData[];
  isLoading: boolean;
}

export function ReferrersDetail({ data, isLoading }: ReferrersDetailProps) {
  // Show loading message if we're loading AND don't have cached data yet (first run)
  if (isLoading && (!data || data.length === 0)) {
    return <List.Item.Detail markdown="Loading referrers data..." />;
  }

  if (!data || data.length === 0) {
    return <List.Item.Detail markdown="No referrers data available" />;
  }

  // If we have data but are loading (refreshing), show spinner
  const isRefreshing = isLoading && data && data.length > 0;

  const referrerChartUrl = generateBarChartUrl(
    data.map((r) => r?.referrer ?? "").filter(Boolean),
    data.map((r) => r?.views ?? 0),
    environment.appearance,
  );

  return (
    <List.Item.Detail
      isLoading={isRefreshing}
      markdown={`<img src="${referrerChartUrl}" alt="Top Referrers" height="180" />`}
      metadata={
        <List.Item.Detail.Metadata>
          {data.map((referrer, index) => {
            if (!referrer || !referrer.referrer) return null;
            return (
              <List.Item.Detail.Metadata.TagList key={referrer.referrer} title={`${index + 1} ∙ ${referrer.referrer}`}>
                <List.Item.Detail.Metadata.TagList.Item
                  key={`${referrer.referrer}-views`}
                  text={formatNumberLong(referrer.views ?? 0)}
                  color={index === 0 ? Color.Green : undefined}
                />
                <List.Item.Detail.Metadata.TagList.Item
                  key={`${referrer.referrer}-percentage`}
                  text={`${(referrer.percentage ?? 0).toFixed(1)}%`}
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
