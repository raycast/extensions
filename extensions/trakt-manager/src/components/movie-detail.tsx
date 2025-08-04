import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { useCallback, useState } from "react";
import { IMDB_APP_URL, TRAKT_APP_URL } from "../lib/constants";
import { getIMDbUrl, getPosterUrl, getTraktUrl } from "../lib/helper";
import { TraktMovieListItem } from "../lib/schema";

interface MovieDetailProps {
  movie: TraktMovieListItem;
  onAddToWatchlist?: (movie: TraktMovieListItem) => Promise<void>;
  onAddToHistory?: (movie: TraktMovieListItem) => Promise<void>;
}

export const MovieDetail = ({ movie, onAddToWatchlist, onAddToHistory }: MovieDetailProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = useCallback(
    async (action: (movie: TraktMovieListItem) => Promise<void>, message: string) => {
      if (!action) return;
      setIsLoading(true);
      try {
        await action(movie);
      } catch (error) {
        console.error(message, error);
      } finally {
        setIsLoading(false);
      }
    },
    [movie],
  );

  const posterUrl = getPosterUrl(movie.movie.images, "poster.png");
  const year = movie.movie.year ? ` (${movie.movie.year})` : "";

  const markdown = `
${posterUrl !== "poster.png" ? `<img src="${posterUrl}" alt="Movie Poster" height="250" />` : ""}

# ${movie.movie.title}${year}

Use the action panel to manage this movie or view it on external platforms.
`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={`${movie.movie.title}${year}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Title" text={movie.movie.title} />
          {movie.movie.year && <Detail.Metadata.Label title="Year" text={movie.movie.year.toString()} />}

          <Detail.Metadata.Separator />

          {movie.last_watched_at && (
            <Detail.Metadata.Label title="Last Watched" text={new Date(movie.last_watched_at).toLocaleDateString()} />
          )}
          {movie.plays && movie.plays > 0 && <Detail.Metadata.Label title="Play Count" text={movie.plays.toString()} />}

          {(movie.movie.ids.trakt || movie.movie.ids.imdb || movie.movie.ids.tmdb) && (
            <>
              <Detail.Metadata.Separator />
              {movie.movie.ids.trakt && (
                <Detail.Metadata.Label title="Trakt ID" text={movie.movie.ids.trakt.toString()} />
              )}
              {movie.movie.ids.imdb && <Detail.Metadata.Label title="IMDb ID" text={movie.movie.ids.imdb} />}
              {movie.movie.ids.tmdb && <Detail.Metadata.Label title="TMDb ID" text={movie.movie.ids.tmdb.toString()} />}
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {onAddToWatchlist && (
              <Action
                title="Add to Watchlist"
                icon={Icon.Bookmark}
                onAction={() => handleAction(onAddToWatchlist, "Failed to add movie to watchlist")}
              />
            )}
            {onAddToHistory && (
              <Action
                title="Mark as Watched"
                icon={Icon.Checkmark}
                shortcut={Keyboard.Shortcut.Common.Edit}
                onAction={() => handleAction(onAddToHistory, "Failed to add movie to history")}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              icon={getFavicon(TRAKT_APP_URL)}
              title="Open in Trakt"
              shortcut={Keyboard.Shortcut.Common.Open}
              url={getTraktUrl("movies", movie.movie.ids.slug)}
            />
            <Action.OpenInBrowser
              icon={getFavicon(IMDB_APP_URL)}
              title="Open in Imdb"
              url={getIMDbUrl(movie.movie.ids.imdb)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};
