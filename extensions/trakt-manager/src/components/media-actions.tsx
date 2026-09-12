import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { GenericDetail } from "./generic-detail";
import { SeasonGrid } from "./season-grid";
import { IMDB_APP_URL, IMDB_SHORTCUT, TRAKT_APP_URL } from "../lib/constants";
import { createMovieMarkdown, createMovieMetadata } from "../lib/detail-helpers";
import { getIMDbUrl, getTraktUrl } from "../lib/helper";
import { TraktMovieHistoryListItem, TraktMovieListItem, TraktShowListItem } from "../lib/schema";

type MediaAction<T> = {
  title: string;
  icon: Icon;
  shortcut?: Keyboard.Shortcut;
  onAction: (item: T) => void;
};

type MovieActionItem = TraktMovieListItem | TraktMovieHistoryListItem;

type MovieActionPanelProps<M extends MovieActionItem> = {
  item: M;
  actions: MediaAction<M>[];
};

type ShowActionPanelProps = {
  item: TraktShowListItem;
  actions: MediaAction<TraktShowListItem>[];
  onCheckInFirstEpisode: (item: TraktShowListItem) => void;
};

const MovieBrowserActions = <M extends MovieActionItem>({ item }: { item: M }) => (
  <ActionPanel.Section>
    <Action.OpenInBrowser
      icon={getFavicon(TRAKT_APP_URL)}
      title="Open in Trakt"
      shortcut={Keyboard.Shortcut.Common.Open}
      url={getTraktUrl("movies", item.movie.ids.slug)}
    />
    <Action.OpenInBrowser
      icon={getFavicon(IMDB_APP_URL)}
      title="Open in Imdb"
      shortcut={IMDB_SHORTCUT}
      url={getIMDbUrl(item.movie.ids.imdb)}
    />
  </ActionPanel.Section>
);

const MediaActionList = <T,>({ item, actions }: { item: T; actions: MediaAction<T>[] }) => (
  <>
    {actions.map((action) => (
      <Action
        key={action.title}
        title={action.title}
        icon={action.icon}
        shortcut={action.shortcut}
        onAction={() => action.onAction(item)}
      />
    ))}
  </>
);

export const MovieActionPanel = <M extends MovieActionItem>({ item, actions }: MovieActionPanelProps<M>) => (
  <ActionPanel>
    <ActionPanel.Section>
      <Action.Push
        icon={Icon.Eye}
        title="View Details"
        target={
          <GenericDetail
            item={item}
            isLoading={false}
            markdown={(movie) => createMovieMarkdown(movie.movie)}
            metadata={createMovieMetadata}
            navigationTitle={(movie) => movie.movie.title}
            actions={(movie) => (
              <ActionPanel>
                <ActionPanel.Section>
                  <MediaActionList item={movie} actions={actions} />
                </ActionPanel.Section>
                <MovieBrowserActions item={movie} />
              </ActionPanel>
            )}
          />
        }
      />
      <MediaActionList item={item} actions={actions} />
    </ActionPanel.Section>
    <MovieBrowserActions item={item} />
  </ActionPanel>
);

export const ShowActionPanel = ({ item, actions, onCheckInFirstEpisode }: ShowActionPanelProps) => (
  <ActionPanel>
    <ActionPanel.Section>
      <Action.Push
        icon={Icon.Switch}
        title="Browse Seasons"
        target={<SeasonGrid showId={item.show.ids.trakt} slug={item.show.ids.slug} imdbId={item.show.ids.imdb} />}
      />
      <Action
        title="Check-In"
        icon={Icon.Checkmark}
        shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
        onAction={() => onCheckInFirstEpisode(item)}
      />
    </ActionPanel.Section>
    <ActionPanel.Section>
      <Action.OpenInBrowser
        icon={getFavicon(TRAKT_APP_URL)}
        title="Open in Trakt"
        url={getTraktUrl("shows", item.show.ids.slug)}
      />
      <Action.OpenInBrowser icon={getFavicon(IMDB_APP_URL)} title="Open in Imdb" url={getIMDbUrl(item.show.ids.imdb)} />
    </ActionPanel.Section>
    <ActionPanel.Section>
      <MediaActionList item={item} actions={actions} />
    </ActionPanel.Section>
  </ActionPanel>
);
