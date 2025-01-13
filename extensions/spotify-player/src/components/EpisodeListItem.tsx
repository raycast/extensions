import { Image, Icon, List } from "@raycast/api";
import { SimplifiedEpisodeObject } from "../helpers/spotify.api";
import { EpisodeActionPanel } from "./EpisodeActionPanel";
import { formatMs } from "../helpers/formatMs";

type EpisodeListItemProps = {
  episode: SimplifiedEpisodeObject;
  onRefresh?: () => void;
};

export default function EpisodeListItem({ episode, onRefresh }: EpisodeListItemProps) {
  const title = episode.name || "Untitled Episode";
  const icon: Image.ImageLike = episode.images?.[0]?.url
    ? {
        source: episode.images[0].url,
      }
    : { source: Icon.Microphone };

  return (
    <List.Item
      title={title}
      icon={icon}
      accessories={[{ text: formatMs(episode.duration_ms) }]}
      actions={<EpisodeActionPanel title={title} episode={episode} onRefresh={onRefresh} />}
    />
  );
}
