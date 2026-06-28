import { Image, List } from "@raycast/api";
import { formatMs } from "../helpers/formatMs";
import { ShowBase, SimplifiedEpisodeObject } from "../helpers/spotify.api";
import { EpisodeActionPanel } from "./EpisodeActionPanel";

type EpisodeListItemProps = {
  episode: SimplifiedEpisodeObject;
  show?: ShowBase;
};

export default function EpisodeListItem({ episode, show }: EpisodeListItemProps) {
  const title = episode.name || "";

  let icon: Image.ImageLike | undefined = undefined;
  if (show?.images) {
    icon = {
      source: show.images[show.images.length - 1]?.url,
    };
  } else if (episode.images) {
    icon = {
      source: episode.images[episode.images.length - 1]?.url,
    };
  }

  return (
    <List.Item
      icon={icon}
      title={title}
      accessories={[{ text: episode.duration_ms ? formatMs(episode.duration_ms) : undefined }]}
      actions={<EpisodeActionPanel title={title} episode={episode} />}
    />
  );
}
