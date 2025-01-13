import { List } from "@raycast/api";
import { SimplifiedEpisodeObject } from "../helpers/spotify.api";
import EpisodeListItem from "./EpisodeListItem";

type EpisodesSectionProps = {
  episodes: SimplifiedEpisodeObject[] | undefined;
  limit?: number;
  title?: string;
  onRefresh?: () => void;
};

export function EpisodesSection({ episodes, limit, title = "Episodes", onRefresh }: EpisodesSectionProps) {
  if (!episodes) return null;

  const items = limit ? episodes.slice(0, limit) : episodes;

  return (
    <List.Section title={`${title} (${items.length} episodes)`}>
      {items.map((episode) => (
        <EpisodeListItem key={episode.id} episode={episode} onRefresh={onRefresh} />
      ))}
    </List.Section>
  );
}
