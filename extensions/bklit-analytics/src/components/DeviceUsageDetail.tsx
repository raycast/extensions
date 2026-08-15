import { List, Icon, Color, environment } from "@raycast/api";
import { DeviceUsageData } from "../types";
import { formatNumberLong } from "../utils/formatters";
import { generatePieChartUrl } from "../utils/charts";

interface DeviceUsageDetailProps {
  data?: DeviceUsageData;
  isLoading: boolean;
}

export function DeviceUsageDetail({ data, isLoading }: DeviceUsageDetailProps) {
  // Show loading message if we're loading AND don't have cached data yet (first run)
  if (isLoading && (!data || !data.mobile || !data.desktop)) {
    return <List.Item.Detail markdown="Loading device data..." />;
  }

  if (!data || !data.mobile || !data.desktop) {
    return <List.Item.Detail markdown="No device data available" />;
  }

  // If we have data but are loading (refreshing), show spinner
  const isRefreshing = isLoading && !!(data?.mobile && data?.desktop);

  const mobileViews = data.mobile?.views ?? 0;
  const desktopViews = data.desktop?.views ?? 0;

  const deviceChartUrl = generatePieChartUrl(
    ["Mobile", "Desktop"],
    [mobileViews, desktopViews],
    environment.appearance,
  );

  const mobileHigher = mobileViews > desktopViews;

  return (
    <List.Item.Detail
      isLoading={isRefreshing}
      markdown={`<img src="${deviceChartUrl}" alt="Device Distribution" height="180" />`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Mobile">
            <List.Item.Detail.Metadata.TagList.Item
              key="mobile-icon"
              color={mobileHigher ? Color.Green : Color.Red}
              icon={Icon.Eye}
              text={`${formatNumberLong(mobileViews)} views`}
            />
            <List.Item.Detail.Metadata.TagList.Item
              key="mobile-stats"
              text={`${(data.mobile?.percentage ?? 0).toFixed(1)}%`}
              color={mobileHigher ? Color.Green : Color.Red}
            />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.TagList title="Desktop">
            <List.Item.Detail.Metadata.TagList.Item
              key="desktop-icon"
              color={mobileHigher ? Color.Red : Color.Green}
              icon={Icon.Eye}
              text={`${formatNumberLong(desktopViews)} views`}
            />
            <List.Item.Detail.Metadata.TagList.Item
              key="desktop-stats"
              text={`${(data.desktop?.percentage ?? 0).toFixed(1)}%`}
              color={mobileHigher ? Color.Red : Color.Green}
            />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.TagList title="Total">
            <List.Item.Detail.Metadata.TagList.Item
              key="total-views"
              text={`${formatNumberLong(data.total ?? 0)} views`}
              icon={Icon.Eye}
              color={undefined}
            />
          </List.Item.Detail.Metadata.TagList>
        </List.Item.Detail.Metadata>
      }
    />
  );
}
