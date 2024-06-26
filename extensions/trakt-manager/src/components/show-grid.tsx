import { Action, ActionPanel, Grid, Icon, Image, Keyboard } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { SetStateAction } from "react";
import { getIMDbUrl, getPosterUrl, getTraktUrl } from "../lib/helper";
import { Seasons } from "./seasons";

export const ShowGridItems = ({
  shows,
  showDetails,
  subtitle,
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
  shows: TraktShowList | undefined;
  showDetails: Map<number, TMDBShowDetails | undefined>;
  subtitle: (show: TraktShowListItem) => string;
  primaryActionTitle?: string;
  primaryActionIcon?: Image.ImageLike;
  primaryActionShortcut?: Keyboard.Shortcut;
  primaryAction?: (show: TraktShowListItem) => void;
  secondaryActionTitle?: string;
  secondaryActionIcon?: Image.ImageLike;
  secondaryActionShortcut?: Keyboard.Shortcut;
  secondaryAction?: (show: TraktShowListItem) => void;
  tertiaryActionTitle?: string;
  tertiaryActionIcon?: Image.ImageLike;
  tertiaryActionShortcut?: Keyboard.Shortcut;
  tertiaryAction?: (show: TraktShowListItem) => void;
  page: number;
  totalPages: number;
  setPage: (value: SetStateAction<number>) => void;
}) => {
  if (!shows) return null;

  return (
    <>
      {shows.map((show) => {
        const details = showDetails.get(show.show.ids.trakt);

        return (
          <Grid.Item
            key={show.show.ids.trakt}
            title={show.show.title}
            subtitle={subtitle(show)}
            content={getPosterUrl(details?.poster_path, "poster.png")}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.OpenInBrowser
                    icon={getFavicon("https://trakt.tv")}
                    title="Open in Trakt"
                    url={getTraktUrl("shows", show.show.ids.slug)}
                  />
                  <Action.OpenInBrowser
                    icon={getFavicon("https://www.imdb.com")}
                    title="Open in IMDb"
                    url={getIMDbUrl(show.show.ids.imdb)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.Push
                    icon={Icon.Switch}
                    title="Seasons"
                    shortcut={Keyboard.Shortcut.Common.Open}
                    target={
                      <Seasons
                        showId={show.show.ids.trakt}
                        tmdbId={show.show.ids.tmdb}
                        slug={show.show.ids.slug}
                        imdbId={show.show.ids.imdb}
                      />
                    }
                  />
                  {primaryAction && primaryActionTitle && primaryActionIcon && primaryActionShortcut && (
                    <Action
                      icon={primaryActionIcon}
                      title={primaryActionTitle}
                      shortcut={primaryActionShortcut}
                      onAction={() => primaryAction(show)}
                    />
                  )}
                  {secondaryAction && secondaryActionTitle && secondaryActionIcon && secondaryActionShortcut && (
                    <Action
                      icon={secondaryActionIcon}
                      title={secondaryActionTitle}
                      shortcut={secondaryActionShortcut}
                      onAction={() => secondaryAction(show)}
                    />
                  )}
                  {tertiaryAction && tertiaryActionTitle && tertiaryActionIcon && tertiaryActionShortcut && (
                    <Action
                      icon={tertiaryActionIcon}
                      title={tertiaryActionTitle}
                      shortcut={tertiaryActionShortcut}
                      onAction={() => tertiaryAction(show)}
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
