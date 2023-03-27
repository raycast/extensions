import { List } from "@raycast/api";
import { SimplifiedEpisodeObject } from "../helpers/spotify.api";
import EpisodeListItem from "./EpisodeListItem";

type EpisodesSectionProps = {
  episodes: SimplifiedEpisodeObject[] | undefined;
  limit?: number;
};

export function EpisodesSection({ episodes, limit }: EpisodesSectionProps) {
  if (!episodes) return null;

  const items = episodes.slice(0, limit || episodes.length);

  return (
    <List.Section title="Episodes">
      {items?.map((episode) => (
        <EpisodeListItem key={episode.id} episode={episode} />
      ))}
    </List.Section>
  );
}
