import { Action, ActionPanel, Icon, Image, List, PopToRootType, Toast, showHUD, showToast } from "@raycast/api";
import { useContext, useEffect, useState } from "react";

import * as api from "../../api/api";
import * as oauth from "../../api/oauth";
import { ViewTypeCtx } from "../ViewTypeCtx";
import AnimeDetails from "../listDetail";
import { SetEpisodesWatched, getWatchlistItems, statusToText } from "./utils";

export function ManageWatchList() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [items, setItems] = useState<(api.ExtendedAnime & { status: string; episodesWatched: number })[]>([]);

  const { showingDetails: showingDetail, setShowingDetails: setShowingDetail, setViewType } = useContext(ViewTypeCtx);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        await oauth.authorize();

        const fetchedItems = await getWatchlistItems();

        if (isMounted) {
          setItems(fetchedItems);
          setIsLoading(false);
        }
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setIsLoading(false);
          showToast({ style: Toast.Style.Failure, title: String(error) });
        }
      }
    })();

    return () => {
      isMounted = false;
    };
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
                title="Switch to Grid View"
                onAction={() => {
                  setViewType("grid");
                }}
                icon={Icon.AppWindowGrid2x2}
                shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
              />
              <Action
                title={"Remove from Watchlist"}
                onAction={async () => {
                  try {
                    if (!(await api.alertRemoveAnime(item))) return;
                    await api.removeAnime(item);
                    api.removeCachedWatchlist();
                    await showHUD("Removed from Watchlist", {
                      popToRootType: PopToRootType.Immediate,
                    });
                  } catch (error) {
                    console.error(error);
                    await showToast({ style: Toast.Style.Failure, title: String(error) });
                  }
                }}
                icon={Icon.Xmark}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
              />
              <ActionPanel.Section>
                <Action
                  title="Increment Episodes Watched"
                  onAction={async () => {
                    try {
                      const cacheKey = `episodes_${item.id}`;

                      const newEps = await api.incrementEpisodes(item);
                      api.cacheRemove(cacheKey);
                      api.removeCachedWatchlist();
                      await showHUD(`${item.title} now has ${newEps} episodes watched.`, {
                        popToRootType: PopToRootType.Immediate,
                      });
                    } catch (error) {
                      console.error(error);
                      await showToast({ style: Toast.Style.Failure, title: String(error) });
                    }
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
