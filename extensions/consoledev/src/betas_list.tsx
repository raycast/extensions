import { Icon, List } from "@raycast/api";
import FeedItem from "./components/FeedItem";
import { getBetasFeed } from "./util";
import { useCachedPromise } from "@raycast/utils";

export default function BetasList() {
  const { isLoading, data: feed } = useCachedPromise(getBetasFeed, [], {
    failureToastOptions: {
      title: "Failed to fetch Betas.",
    },
  });

  return (
    <List
      isLoading={isLoading}
      navigationTitle={feed?.title}
      searchBarPlaceholder="Filter betas by name"
      isShowingDetail
    >
      {feed?.items.map((beta) => (
        <FeedItem item={beta} key={beta.link} icon={Icon.Gear} />
      ))}
    </List>
  );
}
