import { Action, ActionPanel, Icon, Image, List, LocalStorage, Navigation } from "@raycast/api";
import AddPodcast from "./add-podcast";

import { usePodcast } from "./hooks/usePodcasts";
import EpisodeList from "./episode-list";
import { PODCASTS_FEEDS_KEY } from "./constants";

interface Props {
  feed: string;
  onRemovePodcast: (feed: string) => void;
  onPlay: (title: string, url: string) => Promise<string>;
  onClick: Navigation["push"];
  onAddPodcastSubmitted: () => void;
}

export default function PodcastItem({ feed, onRemovePodcast, onPlay, onClick, onAddPodcastSubmitted }: Props) {
  const { data: item, error } = usePodcast(feed);

  const removePodcast = async (feed: string) => {
    const feedsValue = await LocalStorage.getItem(PODCASTS_FEEDS_KEY);
    if (typeof feedsValue !== "string") return;

    const newFeeds = JSON.parse(feedsValue).filter((url: string) => url !== feed);
    await LocalStorage.setItem(PODCASTS_FEEDS_KEY, JSON.stringify(newFeeds));
    onRemovePodcast(feed);
  };

  if (!item) {
    return null;
  }

  if (error) {
    return <List.Item title={`ERROR: ${error.message}`} />;
  }

  return (
    <List.Item
      id={feed}
      key={feed}
      icon={{
        source: item?.itunes?.image || "",
        fallback: Icon.Livestream,
        mask: Image.Mask.RoundedRectangle,
      }}
      title={{ value: item.title, tooltip: item.description }}
      subtitle={item.description}
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.Livestream}
            title="Episodes"
            target={<EpisodeList feed={item.feed} onPlay={onPlay} />}
          />
          <Action
            icon={Icon.Trash}
            title="Unsubscribe"
            onAction={() => removePodcast(feed)}
            style={Action.Style.Destructive}
          />
          <Action
            icon={Icon.Cog}
            title="Manage Podcasts"
            shortcut={{ modifiers: ["cmd"], key: "," }}
            onAction={() => onClick(<AddPodcast onSubmitted={onAddPodcastSubmitted} />)}
          />
        </ActionPanel>
      }
    />
  );
}
