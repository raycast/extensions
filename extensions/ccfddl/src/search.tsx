import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { cache, CACHE_KEY } from "./api";
import { fetchFromCDN } from "./cdn";
import { Item } from "./types";
import { getMarkdownTable } from "./utils";

function ConferenceListItem({
  item,
  isShowingDetail,
  setIsShowingDetail,
  onRefresh,
}: {
  item: Item;
  isShowingDetail: boolean;
  setIsShowingDetail: (showing: boolean) => void;
  onRefresh: () => void; // Added prop to pass down refresh function
}) {
  // Get the most recent conference
  const latestConf = item.confs?.[0];

  return (
    <List.Item
      key={item.title}
      icon={Icon.Calendar}
      title={item.title}
      subtitle={item.sub}
      accessories={[{ text: `CCF: ${item.rank.ccf}` }, { text: latestConf?.place || "Location unknown" }]}
      actions={
        <ActionPanel>
          {latestConf?.link && <Action.OpenInBrowser title="Open Conference Website" url={latestConf.link} />}
          <Action
            title="Refresh Data"
            icon={Icon.RotateClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={onRefresh} // Use the passed function
          />
          <Action
            title="Toggle Detail View"
            icon={Icon.Eye}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={() => setIsShowingDetail(!isShowingDetail)}
          />
          <Action.CopyToClipboard
            title="Copy Conference Info"
            content={`${item.title}: ${item.description}`}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          markdown={getMarkdownTable(item)}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Conference" text={item.title} />
              <List.Item.Detail.Metadata.Label title="Description" text={item.description} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Category" text={item.sub} />
              <List.Item.Detail.Metadata.Label title="CCF Rank" text={item.rank.ccf || "N/A"} />
              <List.Item.Detail.Metadata.Label title="CORE Rank" text={item.rank.core || "N/A"} />
              <List.Item.Detail.Metadata.Label title="THCPL Rank" text={item.rank.thcpl || "N/A"} />
              {latestConf && (
                <>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Next Conference" text={`${latestConf.year}`} />
                  <List.Item.Detail.Metadata.Label
                    title="Next Deadline"
                    text={latestConf.timeline?.[0]?.deadline || "N/A"}
                  />
                  <List.Item.Detail.Metadata.Label title="Timezone" text={latestConf.timezone || "N/A"} />
                </>
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}

export default function Command() {
  // State declarations
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isShowingDetail, setIsShowingDetail] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  // Function to refresh data manually
  function refreshData() {
    console.log("Manually refreshing data from CDN");
    setIsRefreshing(true);
    cache.remove(CACHE_KEY); // Clear the cache

    fetchFromCDN(true, {
      onSuccess: (data) => {
        setItems(data);
      },
      onError: async (error) => {
        console.error("Manual refresh failed:", error);
        const { showFailureToast } = await import("@raycast/utils");
        showFailureToast("Failed to refresh conference data", {
          title: "Refresh Error",
          primaryAction: {
            title: "Try Again",
            onAction: refreshData,
          },
        });
      },
      onFinish: () => {
        setIsRefreshing(false);
      },
    });
  }

  // Function to fetch data (either from cache or GitHub)
  async function fetchData() {
    try {
      // Check cache first
      const cachedData = cache.get(CACHE_KEY);
      if (cachedData) {
        console.log("Using cached conference data");
        setItems(JSON.parse(cachedData));
        setLoading(false);
        return;
      }

      // Fetch from CDN if no cache
      setIsRefreshing(true);
      await fetchFromCDN(false, {
        onSuccess: (data) => {
          setItems(data);
        },
        onError: async (error) => {
          console.error("Failed to load conference data:", error);
          const { showFailureToast } = await import("@raycast/utils");
          showFailureToast("Failed to load conference data", {
            title: "Loading Error",
            primaryAction: {
              title: "Try Again",
              onAction: fetchData,
            },
          });
        },
        onFinish: () => {
          setLoading(false);
          setIsRefreshing(false);
        },
      });
    } catch (error) {
      console.error("Unexpected error in fetchData:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "An unexpected error occurred",
      });
      setLoading(false);
      setIsRefreshing(false);
    }
  }

  return (
    <List
      isLoading={loading || isRefreshing}
      isShowingDetail={isShowingDetail}
      searchBarPlaceholder="Search conferences..."
      throttle={true}
    >
      {items.map((item) => (
        <ConferenceListItem
          key={item.title}
          item={item}
          isShowingDetail={isShowingDetail}
          setIsShowingDetail={setIsShowingDetail}
          onRefresh={refreshData} // Pass the refresh function to child component
        />
      ))}
    </List>
  );
}
