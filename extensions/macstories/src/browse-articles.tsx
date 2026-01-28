import { List, Image, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { FeedSchema, type Item } from "./lib/schema";

const RSS_FEED_URL = "https://www.macstories.net/feed/json";

function itemAccessories(item: Item): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [
    { date: item.date_published },
    ...item.authors.map<List.Item.Accessory>((ath) => ({
      icon: { source: ath.avatar, mask: Image.Mask.Circle },
      tooltip: ath.name,
    })),
  ];
  return accessories;
}
export default function Command() {
  const { isLoading, data, error } = useFetch(RSS_FEED_URL, {
    async parseResponse(response) {
      const feed = await response.json();

      const { success, data } = FeedSchema.safeParse(feed);

      return success ? data.items : null;
    },
  });

  if (error) {
    showToast({
      title: "An error occurred while fetching the feed.",
      style: Toast.Style.Failure,
    });
    return null;
  }

  return (
    <List isLoading={isLoading} navigationTitle="MacStories">
      {!data?.length && <List.EmptyView />}
      {data?.map((item) => (
        <List.Item
          key={item.id}
          title={item.title}
          accessories={itemAccessories(item)}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={item.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
