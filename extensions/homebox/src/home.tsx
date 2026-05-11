import { useCachedPromise } from "@raycast/utils";
import { homebox } from "./homebox";
import { Icon, List } from "@raycast/api";

export default function Home() {
  const { isLoading, data: stats } = useCachedPromise(homebox.getGroupStatistics);

  return (
    <List isLoading={isLoading} isShowingDetail>
      {stats && (
        <List.Item
          icon={Icon.LineChart}
          title="Quick Statistics"
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Total Value" text={stats.totalItemPrice.toString()} />
                  <List.Item.Detail.Metadata.Label title="Total Items" text={stats.totalItems.toString()} />
                  <List.Item.Detail.Metadata.Label title="Total Locations" text={stats.totalLocations.toString()} />
                  <List.Item.Detail.Metadata.Label title="Total Labels" text={stats.totalLabels.toString()} />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      )}
    </List>
  );
}
