import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { IMDB_APP_URL, IMDB_SHORTCUT, TRAKT_APP_URL } from "../lib/constants";
import { getIMDbUrl, getTraktUrl } from "../lib/helper";
import { GenericDetail } from "./generic-detail";

type EpisodeAction<T> = {
  title: string;
  icon: Icon;
  shortcut?: Keyboard.Shortcut;
  onAction: (item: T) => void;
};

type EpisodeActionPanelProps<T> = {
  item: T;
  actions: EpisodeAction<T>[];
  markdown: (item: T) => string;
  metadata: (item: T) => Detail.Props["metadata"];
  navigationTitle: (item: T) => string;
  traktUrl: (item: T) => string;
  imdbId: (item: T) => string;
};

const EpisodeActionList = <T,>({ item, actions }: { item: T; actions: EpisodeAction<T>[] }) => (
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

const EpisodeBrowserActions = <T,>({
  item,
  traktUrl,
  imdbId,
}: Pick<EpisodeActionPanelProps<T>, "item" | "traktUrl" | "imdbId">) => (
  <ActionPanel.Section>
    <Action.OpenInBrowser
      icon={getFavicon(TRAKT_APP_URL)}
      title="Open in Trakt"
      shortcut={Keyboard.Shortcut.Common.Open}
      url={traktUrl(item)}
    />
    <Action.OpenInBrowser
      icon={getFavicon(IMDB_APP_URL)}
      title="Open in Imdb"
      shortcut={IMDB_SHORTCUT}
      url={getIMDbUrl(imdbId(item))}
    />
  </ActionPanel.Section>
);

export const episodeTraktUrl = (slug: string | undefined, season: number, episode: number) =>
  getTraktUrl("episode", slug, season, episode);

export const EpisodeActionPanel = <T,>({
  item,
  actions,
  markdown,
  metadata,
  navigationTitle,
  traktUrl,
  imdbId,
}: EpisodeActionPanelProps<T>) => (
  <ActionPanel>
    <ActionPanel.Section>
      <Action.Push
        icon={Icon.Eye}
        title="View Details"
        target={
          <GenericDetail
            item={item}
            isLoading={false}
            markdown={markdown}
            metadata={metadata}
            navigationTitle={navigationTitle}
            actions={(detailItem) => (
              <ActionPanel>
                <ActionPanel.Section>
                  <EpisodeActionList item={detailItem} actions={actions} />
                </ActionPanel.Section>
                <EpisodeBrowserActions item={detailItem} traktUrl={traktUrl} imdbId={imdbId} />
              </ActionPanel>
            )}
          />
        }
      />
      <EpisodeActionList item={item} actions={actions} />
    </ActionPanel.Section>
    <EpisodeBrowserActions item={item} traktUrl={traktUrl} imdbId={imdbId} />
  </ActionPanel>
);
