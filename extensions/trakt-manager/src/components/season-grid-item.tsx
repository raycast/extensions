import { Action, ActionPanel, Grid, Icon, Keyboard, Toast, showToast } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import { useRef } from "react";
import { getTMDBSeasonDetails } from "../api/tmdb";
import { getIMDbUrl, getPosterUrl, getTraktUrl } from "../lib/helper";
import { EpisodeGrid } from "./episode-grid";

export const SeasonGridItem = ({
  season,
  tmdbId,
  slug,
  imdbId,
  showId,
}: {
  season: TraktSeasonListItem;
  tmdbId: number;
  slug: string;
  imdbId: string;
  showId: number;
}) => {
  const abortable = useRef<AbortController>();
  const { data: seasonDetail } = useCachedPromise(
    async (tmdbId: number, season: TraktSeasonListItem) => {
      return await getTMDBSeasonDetails(tmdbId, season.number, abortable.current?.signal);
    },
    [tmdbId, season],
    {
      initialData: undefined,
      keepPreviousData: true,
      abortable,
      onError(error) {
        showToast({
          title: error.message,
          style: Toast.Style.Failure,
        });
      },
    },
  );

  return (
    <Grid.Item
      key={season.ids.trakt}
      title={season.title}
      subtitle={season.first_aired ? new Date(season.first_aired).getFullYear().toString() : "Not Aired"}
      content={getPosterUrl(seasonDetail?.poster_path, "poster.png")}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              icon={getFavicon("https://trakt.tv")}
              title="Open in Trakt"
              url={getTraktUrl("season", slug, season.number)}
            />
            <Action.OpenInBrowser
              icon={getFavicon("https://www.imdb.com")}
              title="Open in IMDb"
              url={getIMDbUrl(imdbId, season.number)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.Push
              icon={Icon.Switch}
              title="Episodes"
              shortcut={Keyboard.Shortcut.Common.Open}
              target={<EpisodeGrid showId={showId} tmdbId={tmdbId} seasonNumber={season.number} slug={slug} />}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};
