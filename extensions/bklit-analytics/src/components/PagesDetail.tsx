import { List, Color, environment } from "@raycast/api";
import { PageData } from "../types";
import { formatNumberLong } from "../utils/formatters";
import { generateBarChartUrl } from "../utils/charts";

interface PagesDetailProps {
  data?: PageData[];
  isLoading: boolean;
}

export function PagesDetail({ data, isLoading }: PagesDetailProps) {
  // Show loading message if we're loading AND don't have cached data yet (first run)
  if (isLoading && (!data || data.length === 0)) {
    return <List.Item.Detail markdown="Loading pages data..." />;
  }

  if (!data || data.length === 0) {
    return <List.Item.Detail markdown="No pages data available" />;
  }

  // If we have data but are loading (refreshing), show spinner
  const isRefreshing = isLoading && data && data.length > 0;

  const pagesChartUrl = generateBarChartUrl(
    data.map((p) => p?.path ?? "").filter(Boolean),
    data.map((p) => p?.views ?? 0),
    environment.appearance,
  );

  return (
    <List.Item.Detail
      isLoading={isRefreshing}
      markdown={`<img src="${pagesChartUrl}" alt="Top Pages" height="180" />`}
      metadata={
        <List.Item.Detail.Metadata>
          {data.map((page, index) => {
            if (!page || !page.path) return null;
            return (
              <List.Item.Detail.Metadata.TagList key={page.path} title={`${index + 1} ∙ ${page.path}`}>
                <List.Item.Detail.Metadata.TagList.Item
                  key={`${page.path}-views`}
                  text={formatNumberLong(page.views ?? 0)}
                  color={index === 0 ? Color.Green : undefined}
                />
                <List.Item.Detail.Metadata.TagList.Item
                  key={`${page.path}-label`}
                  text="views"
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
