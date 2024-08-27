import { Action, ActionPanel, Grid, Icon, Keyboard } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import { useRef } from "react";
import { getTMDBEpisodeDetails } from "../api/tmdb";
import { getIMDbUrl, getPosterUrl, getTraktUrl } from "../lib/helper";

const formatter = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "2-digit" });

export const EpisodeGridItem = ({
  episode,
  tmdbId,
  seasonNumber,
  slug,
  checkInEpisodeMutation,
}: {
  episode: TraktEpisodeListItem;
  tmdbId: number;
  seasonNumber: number;
  slug: string;
  checkInEpisodeMutation: (episode: TraktEpisodeListItem) => Promise<void>;
}) => {
  const abortable = useRef<AbortController>();
  const { data: episodeDetail } = useCachedPromise(
    async (tmdbId: number, seasonNumber: number, episodeNumber: number) => {
      return await getTMDBEpisodeDetails(tmdbId, seasonNumber, episodeNumber, abortable.current?.signal);
    },
    [tmdbId, seasonNumber, episode.number],
    { abortable },
  );

  return (
    <Grid.Item
      key={episode.ids.trakt}
      title={`${episode.number}. ${episode.title}`}
      subtitle={formatter.format(new Date(episode.first_aired))}
      content={getPosterUrl(episodeDetail?.still_path, "episode.png")}
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
              onAction={() => checkInEpisodeMutation(episode)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};
