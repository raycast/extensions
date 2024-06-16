import { Action, ActionPanel, Grid, Icon, Image, Keyboard, openExtensionPreferences } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { SetStateAction } from "react";
import { getIMDbUrl, getPosterUrl, getTraktUrl } from "../lib/helper";
import { Seasons } from "./seasons";

export const ShowGrid = ({
  shows,
  watchlistActionTitle,
  watchlistIcon,
  watchlistActionShortcut,
  watchlistAction,
  addToHistoryAction,
  page,
  totalPages,
  setPage,
}: {
  shows: TraktShowList | undefined;
  watchlistActionTitle: string;
  watchlistIcon: Image.ImageLike;
  watchlistActionShortcut: Keyboard.Shortcut;
  watchlistAction: (traktId: number) => void;
  addToHistoryAction: (movieId: number) => void;
  page: number;
  totalPages: number;
  setPage: (value: SetStateAction<number>) => void;
}) => {
  if (!shows) return null;

  return (
    <>
      {shows.map((show) => (
        <Grid.Item
          key={show.show.ids.trakt}
          title={show.show.title}
          subtitle={show.show.year?.toString() || ""}
          content={getPosterUrl(show.show.details?.poster_path, "poster.png")}
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
                      traktId={show.show.ids.trakt}
                      tmdbId={show.show.ids.tmdb}
                      slug={show.show.ids.slug}
                      imdbId={show.show.ids.imdb}
                    />
                  }
                />
                <Action
                  icon={watchlistIcon}
                  title={watchlistActionTitle}
                  shortcut={watchlistActionShortcut}
                  onAction={() => watchlistAction(show.show.ids.trakt)}
                />
                <Action
                  icon={Icon.Clock}
                  title="Add to History"
                  shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
                  onAction={() => addToHistoryAction(show.show.ids.trakt)}
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
