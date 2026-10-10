import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { GenericDetail } from "./generic-detail";
import { SeasonGrid } from "./season-grid";
import { IMDB_APP_URL, IMDB_SHORTCUT, TRAKT_APP_URL } from "../lib/constants";
import { createMovieMarkdown, createMovieMetadata } from "../lib/detail-helpers";
import { getIMDbUrl, getTraktUrl } from "../lib/helper";
import {
  TraktMovieHistoryListItem,
  TraktMovieListItem,
  TraktPlaybackMovieItem,
  TraktShowListItem,
} from "../lib/schema";

export type MediaAction<T> = {
  title: string;
  icon: Icon;
  shortcut?: Keyboard.Shortcut;
  onAction: (item: T) => void;
};

type MovieActionItem = TraktMovieListItem | TraktMovieHistoryListItem | TraktPlaybackMovieItem;

type MovieActionPanelProps<M extends MovieActionItem> = {
  item: M;
  actions: MediaAction<M>[];
  /**
   * The main action after "View Details" (so it gets ⌘↵), and first in the detail view.
   * "View Details" keeps Enter: Raycast asks extensions not to change a default action silently.
   */
  primaryAction?: MediaAction<M>;
  /** Extra actions placed right after `primaryAction`. */
  afterPrimary?: ActionPanel.Props["children"];
  /** Extra sections added after the browser links, e.g. destructive actions. */
  footer?: ActionPanel.Props["children"];
  /**
   * Replaces `actions`, in the panel and in the detail view. Use a component that
   * reads its own state: a detail view keeps what it was opened with and would not see later changes.
   */
  actionItems?: (item: M) => ActionPanel.Props["children"];
};

type ShowActionPanelProps = {
  item: TraktShowListItem;
  actions: MediaAction<TraktShowListItem>[];
  /** Replaces `actions`. */
  actionItems?: ActionPanel.Props["children"];
  onMarkFirstEpisodeWatched: (item: TraktShowListItem) => void;
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

export const MovieActionPanel = <M extends MovieActionItem>({
  item,
  actions,
  primaryAction,
  afterPrimary,
  footer,
  actionItems,
}: MovieActionPanelProps<M>) => (
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
                  {primaryAction && <MediaActionList item={movie} actions={[primaryAction]} />}
                  {afterPrimary}
                  {actionItems ? actionItems(movie) : <MediaActionList item={movie} actions={actions} />}
                </ActionPanel.Section>
                <MovieBrowserActions item={movie} />
                {footer}
              </ActionPanel>
            )}
          />
        }
      />
      {primaryAction && <MediaActionList item={item} actions={[primaryAction]} />}
      {afterPrimary}
      {actionItems ? actionItems(item) : <MediaActionList item={item} actions={actions} />}
    </ActionPanel.Section>
    <MovieBrowserActions item={item} />
    {footer}
  </ActionPanel>
);

export const ShowActionPanel = ({ item, actions, actionItems, onMarkFirstEpisodeWatched }: ShowActionPanelProps) => (
  <ActionPanel>
    <ActionPanel.Section>
      <Action.Push
        icon={Icon.Switch}
        title="Browse Seasons"
        target={<SeasonGrid showId={item.show.ids.trakt} slug={item.show.ids.slug} imdbId={item.show.ids.imdb} />}
      />
      <Action
        title="Mark First Episode as Watched"
        icon={Icon.Checkmark}
        shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
        onAction={() => onMarkFirstEpisodeWatched(item)}
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
    <ActionPanel.Section>{actionItems ?? <MediaActionList item={item} actions={actions} />}</ActionPanel.Section>
  </ActionPanel>
);
