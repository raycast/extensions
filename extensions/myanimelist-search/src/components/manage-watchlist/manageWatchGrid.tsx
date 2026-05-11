import { Action, ActionPanel, Grid, Icon, PopToRootType, Toast, showHUD, showToast } from "@raycast/api";
import { useCallback, useContext, useEffect, useState } from "react";

import * as api from "../../api/api";
import * as oauth from "../../api/oauth";
import { ViewTypeCtx } from "../ViewTypeCtx";
import { SetEpisodesWatched, getWatchlistItems, statusToText } from "./utils";

export function ManageWatchGrid() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [items, setItems] = useState<(api.ExtendedAnime & { status: string; episodesWatched: number })[]>([]);
  const [page, setPage] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  const ITEMS_PER_PAGE = 30;

  const { setViewType } = useContext(ViewTypeCtx);

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
    (async () => {
      try {
        await oauth.authorize();
        await loadItems(0);
        setIsLoading(false);
      } catch (error) {
        console.error(error);
        setIsLoading(false);
        showToast({ style: Toast.Style.Failure, title: String(error) });
      }
    })();
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
    <Grid
      isLoading={isLoading}
      columns={5}
      aspectRatio="2/3"
      fit={Grid.Fit.Fill}
      searchBarPlaceholder="Search your watchlist..."
      pagination={{
        onLoadMore: handleLoadMore,
        hasMore: hasMore,
        pageSize: ITEMS_PER_PAGE,
      }}
    >
      {items.map((anime) => (
        <Grid.Item
          key={anime.id}
          content={anime.main_picture.large}
          title={anime.title}
          subtitle={`${statusToText(anime.status)} - ${anime.episodesWatched}/${anime.num_episodes}`}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`https://myanimelist.net/anime/${anime.id}`} />
              <Action
                title="Switch to List View"
                onAction={() => setViewType("list")}
                icon={Icon.List}
                shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
              />
              <Action
                title={"Remove from Watchlist"}
                onAction={async () => {
                  try {
                    if (!(await api.alertRemoveAnime(anime))) return;
                    await api.removeAnime(anime);
                    api.removeCachedWatchlist();
                    await showHUD("Removed from Watchlist", {
                      popToRootType: PopToRootType.Immediate,
                    });
                  } catch (error) {
                    console.error(error);
                    showToast({ style: Toast.Style.Failure, title: String(error) });
                  }
                }}
                icon={Icon.Xmark}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
              />
              <ActionPanel.Section>
                <Action
                  title="Increment Episodes Watched"
                  onAction={async () => {
                    const cacheKey = `episodes_${anime.id}`;

                    try {
                      const newEps = await api.incrementEpisodes(anime);
                      api.cacheRemove(cacheKey);
                      api.removeCachedWatchlist();
                      await showHUD(`${anime.title} now has ${newEps} episodes watched.`, {
                        popToRootType: PopToRootType.Immediate,
                      });
                    } catch (error) {
                      console.error(error);
                      showToast({
                        style: Toast.Style.Failure,
                        title: String(error),
                      });
                    }
                  }}
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                />
                <Action.Push
                  title="Set Episodes Watched"
                  target={<SetEpisodesWatched anime={anime} />}
                  icon={Icon.Keyboard}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.CopyToClipboard
                  content={`https://myanimelist.net/anime/${anime.id}`}
                  title="Copy Link"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  icon={Icon.Link}
                />
                {anime.alternative_titles.ja && (
                  <Action.CopyToClipboard
                    content={anime.title}
                    title="Copy Original Title"
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                  />
                )}
                {anime.alternative_titles.en && (
                  <Action.CopyToClipboard
                    content={anime.alternative_titles.en}
                    title="Copy English Title"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                  />
                )}
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
