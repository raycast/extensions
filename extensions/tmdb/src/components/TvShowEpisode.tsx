import { Action, ActionPanel, Color, Detail, Icon, showToast, Toast } from "@raycast/api";
import { format } from "date-fns";
import { useCachedPromise } from "@raycast/utils";
import { moviedb } from "../api";
import { useState } from "react";
import { formatTVEpisodeDuration } from "../helpers";

export default function TvShowEpisode({
  showId,
  seasonNumber,
  _episodeNumber,
  episodeStart,
  episodeEnd,
  seasonName,
}: {
  showId: number;
  seasonNumber: number;
  _episodeNumber: number;
  episodeStart: number;
  episodeEnd: number;
  seasonName: string;
}) {
  const [episodeNumber, setEpisodeNumber] = useState<number>(_episodeNumber);

  const { data: episodeDetails, isLoading: isLoadingEpisodeDetails } = useCachedPromise(
    async (showId, seasonNumber, episodeNumber) => {
      if (showId && seasonNumber && episodeNumber) {
        const episodeInfo = await moviedb.episodeInfo({
          season_number: seasonNumber,
          episode_number: episodeNumber,
          id: showId,
        });
        return episodeInfo;
      }
    },
    [showId, seasonNumber, episodeNumber],
    {
      onError: async (error) => {
        await showToast(Toast.Style.Failure, `Failed to fetch data ${episodeNumber}`, error.message);
      },
      keepPreviousData: true,
    },
  );

  if (!episodeDetails) {
    return null;
  }
  const title = episodeDetails.name ?? "Unknown Name";
  const firstAirDate = episodeDetails.air_date ? format(new Date(episodeDetails.air_date ?? ""), "PP") : "Unknown";
  const rating = episodeDetails.vote_average ? episodeDetails.vote_average.toFixed(1) : "No Ratings";

  const markdown = `![TV Show Banner](https://image.tmdb.org/t/p/w500/${episodeDetails.still_path})\n\n${
    episodeDetails.overview ?? ""
  }`;

  const runtime = episodeDetails.runtime ? episodeDetails.runtime : 0;

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoadingEpisodeDetails}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Title" text={title} />
          <Detail.Metadata.Label title="Air Date" text={firstAirDate} />
          <Detail.Metadata.Label title="Season Name" text={seasonName} />
          <Detail.Metadata.TagList title="Season and Episode Number">
            <Detail.Metadata.TagList.Item text={seasonNumber.toString()} color={Color.Blue} />
            <Detail.Metadata.TagList.Item text={episodeNumber.toString()} color={Color.Green} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label
            title="Runtime"
            text={formatTVEpisodeDuration(runtime)}
            icon={{ source: Icon.Clock, tintColor: Color.Blue }}
          />
          <Detail.Metadata.Label
            title="Rating"
            text={`${rating}${episodeDetails.vote_count ? ` (from ${episodeDetails.vote_count} votes)` : ""}`}
            icon={{ source: Icon.Star, tintColor: Color.Yellow }}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in TMDB"
            url={`https://www.themoviedb.org/tv/${showId}/season/${seasonNumber}/episode/${episodeNumber}`}
          />
          {episodeDetails.id ? (
            <Action.CopyToClipboard
              title={`Copy TMDB ID`}
              content={episodeDetails.id.toString()}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
            />
          ) : null}
          <Action
            title="Next Episode"
            icon={Icon.ArrowRight}
            onAction={() => {
              if (episodeNumber < episodeEnd) {
                setEpisodeNumber(episodeNumber + 1);
              } else {
                setEpisodeNumber(episodeStart);
              }
            }}
            shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
          />
          <Action
            title="Previous Episode"
            icon={Icon.ArrowLeft}
            onAction={() => {
              if (episodeNumber > episodeStart) {
                setEpisodeNumber(episodeNumber - 1);
              } else {
                setEpisodeNumber(episodeEnd);
              }
            }}
            shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
          />
        </ActionPanel>
      }
    />
  );
}
