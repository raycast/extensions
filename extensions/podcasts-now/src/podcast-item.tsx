import { Action, ActionPanel, Icon, Image, List, Navigation } from "@raycast/api";

import { usePodcast } from "./hooks/usePodcasts";
import EpisodeList from "./episode-list";
import ManagePodcast from "./manage-podcast";
import { SearchFeeds } from "./search-feeds";
import { removeFeed } from "./utils";

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
    await removeFeed(feed);
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
            icon={Icon.PlusCircle}
            title="Add Podcast"
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={() => onClick(<SearchFeeds onSubmitted={onAddPodcastSubmitted} />)}
          />
          <Action
            icon={Icon.Cog}
            title="Manage Podcasts"
            shortcut={{ modifiers: ["cmd"], key: "," }}
            onAction={() => onClick(<ManagePodcast onSubmitted={onAddPodcastSubmitted} />)}
          />
        </ActionPanel>
      }
    />
  );
}
