import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Icon,
  Image,
  List,
  PopToRootType,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";

import * as api from "../../api/api";
import * as oauth from "../../api/oauth";
import AnimeDetails from "../listDetail";
import { getWatchlistItems, SetEpisodesWatched, statusToText } from "./utils";

export function ManageWatchList() {
  const preferences = getPreferenceValues();
  const showDetailDefault = preferences.view;

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [items, setItems] = useState<(api.ExtendedAnime & { status: string; episodesWatched: number })[]>([]);

  const [showingDetail, setShowingDetail] = useState(showDetailDefault == "list-detailed");

  useEffect(() => {
    (async () => {
      try {
        await oauth.authorize();

        const fetchedItems = await getWatchlistItems();

        setItems(fetchedItems);
        setIsLoading(false);
      } catch (error) {
        console.error(error);
        setIsLoading(false);
        showToast({ style: Toast.Style.Failure, title: String(error) });
      }
    })();
  }, []);

  return (
    <List isLoading={isLoading} isShowingDetail={showingDetail}>
      {items.map((item) => (
        <List.Item
          key={item.id}
          icon={{
            source: item.main_picture.medium,
            mask: Image.Mask.Circle,
          }}
          title={item.title}
          accessories={
            showingDetail
              ? [{ tag: `${item.episodesWatched}/${item.num_episodes}` }]
              : [{ tag: statusToText(item.status) }, { tag: `${item.episodesWatched}/${item.num_episodes}` }]
          }
          detail={showingDetail && <AnimeDetails anime={item} />}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`https://myanimelist.net/anime/${item.id}`} />
              <Action
                title="Toggle Detailed View"
                onAction={() => setShowingDetail(!showingDetail)}
                icon={Icon.AppWindowSidebarLeft}
              />
              <Action
                title={"Remove from Watchlist"}
                onAction={async () => {
                  await api.removeAnime(item);
                  api.removeCachedWatchlist();
                  await showHUD("Removed from Watchlist", {
                    popToRootType: PopToRootType.Immediate,
                  });
                }}
                icon={Icon.Xmark}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
              />
              <ActionPanel.Section>
                <Action
                  title="Increment Episodes Watched"
                  onAction={async () => {
                    const cacheKey = `episodes_${item.id}`;

                    const newEps = await api.incrementEpisodes(item);
                    api.cacheRemove(cacheKey);
                    api.removeCachedWatchlist();
                    await showHUD(`${item.title} now has ${newEps} episodes watched.`, {
                      popToRootType: PopToRootType.Immediate,
                    });
                  }}
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                />
                <Action.Push
                  title="Set Episodes Watched"
                  target={<SetEpisodesWatched anime={item} />}
                  icon={Icon.Keyboard}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.CopyToClipboard
                  content={`https://myanimelist.net/anime/${item.id}`}
                  title="Copy Link"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  icon={Icon.Link}
                />
                {item.alternative_titles.ja && (
                  <Action.CopyToClipboard
                    content={item.title}
                    title="Copy Original Title"
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                  />
                )}
                {item.alternative_titles.en && (
                  <Action.CopyToClipboard
                    content={item.alternative_titles.en}
                    title="Copy English Title"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                  />
                )}
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
