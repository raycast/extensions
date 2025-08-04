import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { useCallback, useState } from "react";
import { IMDB_APP_URL, TRAKT_APP_URL } from "../lib/constants";
import { getIMDbUrl, getPosterUrl, getTraktUrl } from "../lib/helper";
import { TraktSeasonListItem } from "../lib/schema";
import { EpisodeGrid } from "./episode-grid";

interface SeasonDetailProps {
  season: TraktSeasonListItem;
  showId: number;
  slug: string;
  imdbId: string;
  onAddToHistory?: (season: TraktSeasonListItem) => Promise<void>;
}

export const SeasonDetail = ({ season, showId, slug, imdbId, onAddToHistory }: SeasonDetailProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = useCallback(
    async (action: (season: TraktSeasonListItem) => Promise<void>, message: string) => {
      if (!action) return;
      setIsLoading(true);
      try {
        await action(season);
      } catch (error) {
        console.error(message, error);
      } finally {
        setIsLoading(false);
      }
    },
    [season],
  );

  const posterUrl = getPosterUrl(season.images, "poster.png");
  const navigationTitle = `Season ${season.number}`;

  const markdown = `
${posterUrl !== "poster.png" ? `<img src="${posterUrl}" alt="Season Poster" height="250" />` : ""}

# ${season.title}

Season ${season.number} - ${season.episode_count} episodes

${season.overview || ""}
`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={navigationTitle}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Season" text={season.number.toString()} />
          <Detail.Metadata.Label title="Title" text={season.title} />
          {season.network && <Detail.Metadata.Label title="Network" text={season.network} />}

          <Detail.Metadata.Separator />

          <Detail.Metadata.Label title="Episodes" text={season.episode_count.toString()} icon={Icon.Video} />
          <Detail.Metadata.Label title="Aired Episodes" text={season.aired_episodes.toString()} />
          {season.rating > 0 && <Detail.Metadata.Label title="Rating" text={`${season.rating}/10`} icon={Icon.Star} />}
          {season.votes > 0 && <Detail.Metadata.Label title="Votes" text={season.votes.toString()} />}

          <Detail.Metadata.Separator />

          {season.first_aired && (
            <Detail.Metadata.Label title="First Aired" text={new Date(season.first_aired).toLocaleDateString()} />
          )}
          {season.updated_at && (
            <Detail.Metadata.Label title="Last Updated" text={new Date(season.updated_at).toLocaleDateString()} />
          )}

          {(season.ids.trakt || season.ids.tvdb || season.ids.tmdb) && (
            <>
              <Detail.Metadata.Separator />
              {season.ids.trakt && <Detail.Metadata.Label title="Trakt ID" text={season.ids.trakt.toString()} />}
              {season.ids.tvdb && <Detail.Metadata.Label title="TVDb ID" text={season.ids.tvdb.toString()} />}
              {season.ids.tmdb && <Detail.Metadata.Label title="TMDb ID" text={season.ids.tmdb.toString()} />}
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              icon={Icon.Switch}
              title="Browse Episodes"
              target={<EpisodeGrid showId={showId} seasonNumber={season.number} slug={slug} />}
            />
            {onAddToHistory && (
              <Action
                title="Mark Season as Watched"
                icon={Icon.Clock}
                shortcut={Keyboard.Shortcut.Common.Edit}
                onAction={() => handleAction(onAddToHistory, "Failed to add season to history")}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              icon={getFavicon(TRAKT_APP_URL)}
              title="Open in Trakt"
              shortcut={Keyboard.Shortcut.Common.Open}
              url={getTraktUrl("season", slug, season.number)}
            />
            <Action.OpenInBrowser icon={getFavicon(IMDB_APP_URL)} title="Open in Imdb" url={getIMDbUrl(imdbId)} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};
