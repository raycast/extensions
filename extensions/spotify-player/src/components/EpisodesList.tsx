import { List } from "@raycast/api";
import { SimplifiedShowObject } from "../helpers/spotify.api";

import { useShowEpisodes } from "../hooks/useShowEpisodes";
import EpisodeListItem from "./EpisodeListItem";

type EpisodesListProps = {
  show?: SimplifiedShowObject | null;
};

export function EpisodesList({ show }: EpisodesListProps) {
  const { showEpisodesData, showEpisodesIsLoading } = useShowEpisodes({
    showId: show?.id || "",
    options: {
      execute: Boolean(show?.id),
    },
  });

  const episodes = showEpisodesData?.items;

  if (!show?.id) {
    return (
      <List searchBarPlaceholder="Search episodes">
        <List.EmptyView title="No Podcast Details" description="Spotify did not return details for this podcast." />
      </List>
    );
  }

  return (
    <List searchBarPlaceholder="Search episodes" isLoading={showEpisodesIsLoading}>
      {episodes &&
        episodes.map((episode, index) => (
          <EpisodeListItem key={`${episode.id}${index}`} episode={episode} show={show} />
        ))}
    </List>
  );
}
