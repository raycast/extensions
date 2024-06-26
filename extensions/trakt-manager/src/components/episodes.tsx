import { Action, ActionPanel, Grid, Icon, Keyboard, Toast, showToast } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { useCallback, useEffect, useState } from "react";
import { useEpisodeDetails } from "../hooks/useEpisodeDetails";
import { useEpisodes } from "../hooks/useEpisodes";
import { getIMDbUrl, getPosterUrl, getTraktUrl } from "../lib/helper";

const formatter = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "2-digit" });

export const Episodes = ({
  showId,
  tmdbId,
  seasonNumber,
  slug,
}: {
  showId: number;
  tmdbId: number;
  seasonNumber: number;
  slug: string;
}) => {
  const { episodes, checkInEpisodeMutation, error, success } = useEpisodes(showId, seasonNumber);
  const { details: episodeDetails, error: detailsError } = useEpisodeDetails(tmdbId, seasonNumber, episodes);
  const [actionLoading, setActionLoading] = useState(false);

  const handleAction = useCallback(
    async (episode: TraktEpisodeListItem, action: (episode: TraktEpisodeListItem) => Promise<void>) => {
      setActionLoading(true);
      try {
        await action(episode);
      } finally {
        setActionLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (success) {
      showToast({
        title: success,
        style: Toast.Style.Failure,
      });
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      showToast({
        title: error.message,
        style: Toast.Style.Failure,
      });
    }
  }, [error]);

  useEffect(() => {
    if (detailsError) {
      showToast({
        title: detailsError.message,
        style: Toast.Style.Failure,
      });
    }
  }, [detailsError]);

  const isLoading = !episodes || !episodeDetails.size || actionLoading || !!error || !!detailsError;

  return (
    <Grid
      isLoading={isLoading}
      columns={3}
      aspectRatio="16/9"
      fit={Grid.Fit.Fill}
      searchBarPlaceholder="Search for episodes"
    >
      {episodes &&
        episodes.map((episode) => {
          const details = episodeDetails.get(episode.ids.trakt);

          return (
            <Grid.Item
              key={episode.ids.trakt}
              title={`${episode.number}. ${episode.title}`}
              subtitle={formatter.format(new Date(episode.first_aired))}
              content={getPosterUrl(details?.still_path, "episode.png")}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.OpenInBrowser
                      icon={getFavicon("https://trakt.tv")}
                      title="Open in Trakt"
                      url={getTraktUrl("episode", slug, seasonNumber, episode.number)}
                    />
                    <Action.OpenInBrowser
                      icon={getFavicon("https://www.imdb.com")}
                      title="Open in IMDb"
                      url={getIMDbUrl(episode.ids.imdb)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      icon={Icon.Checkmark}
                      title="Check-in Episode"
                      shortcut={Keyboard.Shortcut.Common.Edit}
                      onAction={() => handleAction(episode, checkInEpisodeMutation)}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
    </Grid>
  );
};
