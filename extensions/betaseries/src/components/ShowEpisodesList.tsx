import { List, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import {
  buildBetaSeriesUrl,
  getHeaders,
  markEpisodeAsWatched,
  parseBetaSeriesResponse,
} from "../api/client";
import { Show, Episode } from "../types/betaseries";
import { EpisodeListItem } from "./EpisodeListItem";

interface ShowEpisodesListProps {
  show: Show;
}

export function ShowEpisodesList({ show }: ShowEpisodesListProps) {
  const {
    data: episodes = [],
    isLoading,
    mutate,
  } = useFetch<{ shows: Array<{ unseen: Episode[] }> }, Episode[]>(
    buildBetaSeriesUrl("/episodes/list", { showId: String(show.id) }),
    {
      headers: getHeaders(),
      initialData: [],
      keepPreviousData: true,
      parseResponse: (response) =>
        parseBetaSeriesResponse<{ shows: Array<{ unseen: Episode[] }> }>(
          response,
        ),
      mapResult: (result) => ({
        data:
          result.shows &&
          result.shows.length > 0 &&
          Array.isArray(result.shows[0].unseen)
            ? result.shows[0].unseen
            : [],
      }),
      onError: (error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load episodes",
          message: error.message,
        });
      },
    },
  );

  const handleMarkAsWatched = async (episodeId: number) => {
    try {
      await mutate(markEpisodeAsWatched(String(episodeId)), {
        revalidate: false,
        optimisticUpdate: (previous = []) =>
          previous.map((ep) =>
            ep.id === episodeId
              ? { ...ep, user: { ...ep.user, seen: true } }
              : ep,
          ),
      });
      showToast({
        style: Toast.Style.Success,
        title: "Episode marked as watched",
      });
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to mark episode as watched",
          message: error.message,
        });
      }
    }
  };

  return (
    <List isLoading={isLoading} navigationTitle={show.title}>
      {!isLoading && episodes.length === 0 && (
        <List.EmptyView
          title="No Unwatched Episodes"
          description="You're all caught up!"
        />
      )}
      {episodes.map((episode) => (
        <EpisodeListItem
          key={episode.id}
          episode={episode}
          onMarkAsWatched={handleMarkAsWatched}
        />
      ))}
    </List>
  );
}
