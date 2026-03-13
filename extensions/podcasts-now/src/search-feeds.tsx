import { Icon, Image, List, ActionPanel, Action, useNavigation } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

import { useSearch } from "./hooks/useSearch";
import { getFeeds, saveFeeds } from "./utils";
import EpisodeList from "./episode-list";
import { play } from "./apple-music";

export function SearchFeeds({ onSubmitted }: { onSubmitted: () => void }) {
  const { pop } = useNavigation();
  const [term, setTerm] = useCachedState<string>("");
  const { isLoading, data } = useSearch(term || "");

  const onSubscribe = (feed: string) => {
    return async () => {
      const feedUrls = await getFeeds();
      feedUrls.push(feed);
      await saveFeeds(feedUrls);
      onSubmitted();
      pop();
    };
  };

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Search Podcasts"
      searchBarPlaceholder="Search from Apple podcasts"
      onSearchTextChange={(term) => setTerm(term)}
    >
      {data?.map((item) => (
        <List.Item
          key={item.id}
          icon={{
            source: item.image,
            fallback: Icon.Livestream,
            mask: Image.Mask.RoundedRectangle,
          }}
          title={item.title}
          subtitle={item.artist}
          accessories={[{ icon: Icon.LightBulb, text: item.genre }, { tag: item.releaseDate }]}
          actions={
            <ActionPanel title="Actions">
              <Action.Push
                icon={Icon.Livestream}
                title="Episodes"
                target={<EpisodeList feed={item.feed} onPlay={(title, feed) => play(title, feed)} />}
              />
              <Action icon={Icon.Tag} title="Subscribe" onAction={onSubscribe(item.feed)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
