import { Action, ActionPanel, Icon, Image, List, PopToRootType, Toast, showHUD, showToast } from "@raycast/api";
import { useCallback, useContext, useEffect, useState } from "react";

import * as api from "../../api/api";
import * as oauth from "../../api/oauth";
import { ViewTypeCtx } from "../ViewTypeCtx";
import AnimeDetails from "../listDetail";
import { SetEpisodesWatched, getWatchlistItems, statusToText } from "./utils";

export function ManageWatchList() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [items, setItems] = useState<(api.ExtendedAnime & { status: string; episodesWatched: number })[]>([]);
  const [page, setPage] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  const ITEMS_PER_PAGE = 30;

  const { showingDetails: showingDetail, setShowingDetails: setShowingDetail, setViewType } = useContext(ViewTypeCtx);

  const loadItems = useCallback(async (currentPage: number, append = false) => {
    try {
      const offset = currentPage * ITEMS_PER_PAGE;
      const fetchedItems = await getWatchlistItems(ITEMS_PER_PAGE, offset);

      if (fetchedItems.length < ITEMS_PER_PAGE) {
        setHasMore(false);
      }

      if (append) {
        setItems((prevItems) => [...prevItems, ...fetchedItems]);
      } else {
        setItems(fetchedItems);
      }

      return fetchedItems;
    } catch (error) {
      console.error(error);
      showToast({ style: Toast.Style.Failure, title: String(error) });
      return [];
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchWatchlist = async () => {
      if (!isMounted) return;

      try {
        await oauth.authorize();
        await loadItems(0);
      } catch (error) {
        console.error("Failed to load watchlist:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load watchlist",
          message: String(error),
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchWatchlist();

    return () => {
      isMounted = false;
    };
  }, [loadItems]);

  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore) return;

    setIsLoadingMore(true);
    const nextPage = page + 1;
    await loadItems(nextPage, true);
    setPage(nextPage);
    setIsLoadingMore(false);
  };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail}
      searchBarPlaceholder="Search your watchlist..."
      pagination={{
        onLoadMore: handleLoadMore,
        hasMore: hasMore,
        pageSize: ITEMS_PER_PAGE,
      }}
    >
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
