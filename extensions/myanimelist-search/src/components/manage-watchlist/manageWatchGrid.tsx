import { Action, ActionPanel, Grid, Icon, PopToRootType, showHUD, showToast, Toast } from "@raycast/api";
import { useContext, useEffect, useState } from "react";

import * as api from "../../api/api";
import * as oauth from "../../api/oauth";
import { getWatchlistItems, SetEpisodesWatched } from "./utils";
import { ViewTypeCtx } from "../ViewTypeCtx";

export function ManageWatchGrid() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [items, setItems] = useState<(api.ExtendedAnime & { status: string; episodesWatched: number })[]>([]);

  const { setViewType } = useContext(ViewTypeCtx);

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
    <Grid isLoading={isLoading} columns={5} aspectRatio="2/3" fit={Grid.Fit.Fill}>
      {!isLoading &&
        items.map((anime) => (
          <Grid.Item
            key={anime.id}
            content={anime.main_picture.large}
            title={anime?.title}
            subtitle={`${anime.episodesWatched}/${anime.num_episodes}`}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`https://myanimelist.net/anime/${anime.id}`} />
                <Action
                  title="Switch to List View"
                  onAction={() => {
                    setViewType("list");
                  }}
                  icon={Icon.List}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                />
                <Action
                  title={"Remove from Watchlist"}
                  onAction={async () => {
                    if (!(await api.alertRemoveAnime(anime))) return;
                    await api.removeAnime(anime);
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
                      const cacheKey = `episodes_${anime.id}`;

                      const newEps = await api.incrementEpisodes(anime);
                      api.cacheRemove(cacheKey);
                      api.removeCachedWatchlist();
                      await showHUD(`${anime.title} now has ${newEps} episodes watched.`, {
                        popToRootType: PopToRootType.Immediate,
                      });
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
