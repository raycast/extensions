import { Action, ActionPanel, Grid, Icon, Image, Keyboard, openExtensionPreferences } from "@raycast/api";
import { SetStateAction } from "react";
import { getIMDbUrl, getPosterUrl, getTraktUrl } from "../lib/helper";

export const MovieGrid = ({
  movies,
  watchlistActionTitle,
  watchlistIcon,
  watchlistActionShortcut,
  watchlistAction,
  checkinAction,
  page,
  totalPages,
  setPage,
}: {
  movies: TraktMovieList | undefined;
  watchlistActionTitle: string;
  watchlistIcon: Image.ImageLike;
  watchlistActionShortcut: Keyboard.Shortcut;
  watchlistAction: (traktId: number) => void;
  checkinAction: (traktId: number) => void;
  page: number;
  totalPages: number;
  setPage: (value: SetStateAction<number>) => void;
}) => {
  if (!movies) return null;

  return (
    <>
      {movies.map((movie) => (
        <Grid.Item
          key={movie.movie.ids.trakt}
          title={movie.movie.title}
          subtitle={movie.movie.year?.toString() || ""}
          content={getPosterUrl(movie.movie.details?.poster_path, "poster.png")}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.OpenInBrowser title="Open in Trakt" url={getTraktUrl("movie", movie.movie.ids.slug)} />
                <Action.OpenInBrowser title="Open in IMDb" url={getIMDbUrl(movie.movie.ids.imdb)} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  icon={watchlistIcon}
                  title={watchlistActionTitle}
                  shortcut={watchlistActionShortcut}
                  onAction={() => watchlistAction(movie.movie.ids.trakt)}
                />
                <Action
                  icon={Icon.Checkmark}
                  title="Check-in Movie"
                  shortcut={Keyboard.Shortcut.Common.Duplicate}
                  onAction={() => checkinAction(movie.movie.ids.trakt)}
                />
                <Action
                  icon={Icon.Cog}
                  title="Open Extension Preferences"
                  onAction={openExtensionPreferences}
                  shortcut={Keyboard.Shortcut.Common.Pin}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                {page === totalPages ? null : (
                  <Action
                    icon={Icon.ArrowRight}
                    title="Next Page"
                    shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
                    onAction={() => setPage((page) => (page + 1 > totalPages ? totalPages : page + 1))}
                  />
                )}
                {page > 1 ? (
                  <Action
                    icon={Icon.ArrowLeft}
                    title="Previous Page"
                    shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
                    onAction={() => setPage((page) => (page - 1 < 1 ? 1 : page - 1))}
                  />
                ) : null}
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </>
  );
};
