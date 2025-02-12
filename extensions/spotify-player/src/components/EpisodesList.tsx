import { List } from "@raycast/api";
import { SimplifiedShowObject } from "../helpers/spotify.api";

import { useShowEpisodes } from "../hooks/useShowEpisodes";
import EpisodeListItem from "./EpisodeListItem";

type EpisodesListProps = {
  show: SimplifiedShowObject;
};

export function EpisodesList({ show }: EpisodesListProps) {
  const { showEpisodesData, showEpisodesIsLoading } = useShowEpisodes({
    showId: show?.id || "",
    options: {
      execute: Boolean(show),
    },
  });

  const episodes = showEpisodesData?.items;

  return (
    <List searchBarPlaceholder="Search episodes" isLoading={showEpisodesIsLoading}>
      {episodes &&
        episodes.map((episode, index) => (
          <EpisodeListItem key={`${episode.id}${index}`} episode={episode} show={show} />
        ))}
    </List>
  );
}
