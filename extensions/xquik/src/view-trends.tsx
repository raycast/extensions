import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { ErrorView } from "./components/error-view";
import { PostFeedList } from "./components/post-feed-list";
import { showErrorToast } from "./lib/error-toast";
import { compactCount } from "./lib/format";
import { Trend } from "./lib/schemas";
import { fetchTrends, TREND_PLACES, trendQuery } from "./lib/trends";

function trendAccessories({ rank, tweetVolume }: Trend): List.Item.Accessory[] {
  return [
    ...(typeof tweetVolume === "number" ? [{ text: `${compactCount(tweetVolume)} posts` }] : []),
    ...(typeof rank === "number" ? [{ tag: `#${rank}` }] : []),
  ];
}

function TrendRow({ trend }: { trend: Trend }) {
  const feed = { kind: "search", query: trendQuery(trend), sort: "Latest", filters: {} } as const;
  return (
    <List.Item
      title={trend.name}
      icon={Icon.Hashtag}
      accessories={trendAccessories(trend)}
      actions={
        <ActionPanel>
          <Action.Push
            title="Search Posts"
            icon={Icon.MagnifyingGlass}
            target={<PostFeedList feed={feed} navigationTitle={trend.name} />}
          />
          {trend.url && <Action.OpenInBrowser url={trend.url} />}
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [place, setPlace] = useCachedState("trend-place", String(TREND_PLACES[0].woeid));
  const { data, error, isLoading, revalidate } = useCachedPromise(fetchTrends, [Number(place)], {
    onError: (failure) => {
      showErrorToast(failure, revalidate);
    },
  });
  const isWaiting = isLoading || (!data && !error);

  function emptyView() {
    if (isWaiting) return null;
    if (error) return <ErrorView error={error} onRetry={revalidate} />;
    return (
      <List.EmptyView icon={Icon.Hashtag} title="No Trends Found" description="X lists no trends here right now." />
    );
  }

  return (
    <List
      isLoading={isWaiting}
      searchBarPlaceholder="Filter Trends"
      searchBarAccessory={
        <List.Dropdown tooltip="Place" value={place} onChange={setPlace}>
          {TREND_PLACES.map(({ title, woeid }) => (
            <List.Dropdown.Item key={woeid} title={title} value={String(woeid)} />
          ))}
        </List.Dropdown>
      }
    >
      {emptyView()}
      {data?.map((trend) => (
        <TrendRow key={trend.name} trend={trend} />
      ))}
    </List>
  );
}
