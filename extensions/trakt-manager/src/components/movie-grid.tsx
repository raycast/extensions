import { Action, ActionPanel, Grid, Icon, Image, Keyboard } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { SetStateAction } from "react";
import { getIMDbUrl, getPosterUrl, getTraktUrl } from "../lib/helper";

export const MovieGridItems = ({
  movies,
  movieDetails,
  primaryActionTitle,
  primaryActionIcon,
  primaryActionShortcut,
  primaryAction,
  secondaryActionTitle,
  secondaryActionIcon,
  secondaryActionShortcut,
  secondaryAction,
  tertiaryActionTitle,
  tertiaryActionIcon,
  tertiaryActionShortcut,
  tertiaryAction,
  page,
  totalPages,
  setPage,
}: {
  movies: TraktMovieList | undefined;
  movieDetails: Map<number, TMDBMovieDetails | undefined>;
  primaryActionTitle?: string;
  primaryActionIcon?: Image.ImageLike;
  primaryActionShortcut?: Keyboard.Shortcut;
  primaryAction?: (movie: TraktMovieListItem) => void;
  secondaryActionTitle?: string;
  secondaryActionIcon?: Image.ImageLike;
  secondaryActionShortcut?: Keyboard.Shortcut;
  secondaryAction?: (movie: TraktMovieListItem) => void;
  tertiaryActionTitle?: string;
  tertiaryActionIcon?: Image.ImageLike;
  tertiaryActionShortcut?: Keyboard.Shortcut;
  tertiaryAction?: (movie: TraktMovieListItem) => void;
  page: number;
  totalPages: number;
  setPage: (value: SetStateAction<number>) => void;
}) => {
  if (!movies) return null;

  return (
    <>
      {movies.map((movie) => {
        const details = movieDetails.get(movie.movie.ids.trakt);

        return (
          <Grid.Item
            key={movie.movie.ids.trakt}
            title={movie.movie.title}
            subtitle={movie.movie.year?.toString() || ""}
            content={getPosterUrl(details?.poster_path, "poster.png")}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.OpenInBrowser
                    icon={getFavicon("https://trakt.tv")}
                    title="Open in Trakt"
                    url={getTraktUrl("movie", movie.movie.ids.slug)}
                  />
                  <Action.OpenInBrowser
                    icon={getFavicon("https://www.imdb.com")}
                    title="Open in IMDb"
                    url={getIMDbUrl(movie.movie.ids.imdb)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  {primaryAction && primaryActionTitle && primaryActionIcon && primaryActionShortcut && (
                    <Action
                      icon={primaryActionIcon}
                      title={primaryActionTitle}
                      shortcut={primaryActionShortcut}
                      onAction={() => primaryAction(movie)}
                    />
                  )}
                  {secondaryAction && secondaryActionTitle && secondaryActionIcon && secondaryActionShortcut && (
                    <Action
                      icon={Icon.Checkmark}
                      title={secondaryActionTitle}
                      shortcut={secondaryActionShortcut}
                      onAction={() => secondaryAction(movie)}
                    />
                  )}
                  {tertiaryAction && tertiaryActionTitle && tertiaryActionIcon && tertiaryActionShortcut && (
                    <Action
                      icon={tertiaryActionIcon}
                      title={tertiaryActionTitle}
                      shortcut={tertiaryActionShortcut}
                      onAction={() => tertiaryAction(movie)}
                    />
                  )}
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
        );
      })}
    </>
  );
};
