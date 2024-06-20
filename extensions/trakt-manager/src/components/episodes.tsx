import { Action, ActionPanel, Grid, Icon, Keyboard, Toast, showToast } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { setMaxListeners } from "events";
import { AbortError } from "node-fetch";
import { useEffect, useRef, useState } from "react";
import { checkInEpisode, getEpisodes } from "../api/shows";
import { getTMDBEpisodeDetails } from "../api/tmdb";
import { getIMDbUrl, getPosterUrl, getTraktUrl } from "../lib/helper";

const formatter = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "2-digit" });

export const Episodes = ({
  traktId,
  tmdbId,
  seasonNumber,
  slug,
}: {
  traktId: number;
  tmdbId: number;
  seasonNumber: number;
  slug: string;
}) => {
  const abortable = useRef<AbortController>();
  const [episodes, setEpisodes] = useState<TraktEpisodeList | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      abortable.current = new AbortController();
      setMaxListeners(30, abortable.current?.signal);
      setIsLoading(true);
      try {
        const episodes = await getEpisodes(traktId, seasonNumber, abortable.current?.signal);
        setEpisodes(episodes);

        const showsWithImages = (await Promise.all(
          episodes.map(async (episode) => {
            episode.details = await getTMDBEpisodeDetails(
              tmdbId,
              seasonNumber,
              episode.number,
              abortable.current?.signal,
            );
            return episode;
          }),
        )) as TraktEpisodeList;

        setEpisodes(showsWithImages);
      } catch (e) {
        if (!(e instanceof AbortError)) {
          showToast({
            title: "Error getting episodes",
            style: Toast.Style.Failure,
          });
        }
      }
      setIsLoading(false);
      return () => {
        if (abortable.current) {
          abortable.current.abort();
        }
      };
    })();
  }, []);

  const onCheckInEpisode = async (episodeId: number) => {
    setIsLoading(true);
    try {
      await checkInEpisode(episodeId, abortable.current?.signal);
      showToast({
        title: "Episode checked in",
        style: Toast.Style.Success,
      });
    } catch (e) {
      if (!(e instanceof AbortError)) {
        showToast({
          title: "Error checking in episode",
          style: Toast.Style.Failure,
        });
      }
    }
    setIsLoading(false);
  };

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
          return (
            <Grid.Item
              key={episode.ids.trakt}
              title={`${episode.number}. ${episode.title}`}
              subtitle={formatter.format(new Date(episode.first_aired))}
              content={getPosterUrl(episode.details?.still_path, "episode.png")}
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
                      onAction={() => onCheckInEpisode(episode.ids.trakt)}
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
