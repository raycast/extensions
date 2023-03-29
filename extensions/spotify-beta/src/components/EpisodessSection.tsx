import { List } from "@raycast/api";
import { SimplifiedEpisodeObject } from "../helpers/spotify.api";
import EpisodeListItem from "./EpisodeListItem";

type EpisodesSectionProps = {
  episodes: SimplifiedEpisodeObject[] | undefined;
  limit?: number;
  title?: string;
};

export function EpisodesSection({ episodes, limit, title = "Episodes" }: EpisodesSectionProps) {
  if (!episodes) return null;

  const items = episodes.slice(0, limit || episodes.length);

  return (
    <List.Section title={title}>
      {items?.map((episode) => (
        <EpisodeListItem key={episode.id} episode={episode} />
      ))}
    </List.Section>
  );
}
