import { Action, ActionPanel, Grid, Icon, PopToRootType, showHUD } from "@raycast/api";
import { useContext, useState } from "react";

import { addAnime, alertRemoveAnime, removeAnime, removeCachedWatchlist } from "../../api/api";
import { authorize } from "../../api/oauth";
import useSearch from "../../api/useSearch";
import { ViewTypeCtx } from "../ViewTypeCtx";

export default function SearchAnimeGrid() {
  const [searchText, setSearchText] = useState("");
  const { setViewType } = useContext(ViewTypeCtx);
  const { isLoading, items: data, clearCache: clearSearchCache } = useSearch({ q: searchText });

  return (
    <Grid
      isLoading={isLoading}
      columns={5}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      aspectRatio="2/3"
      fit={Grid.Fit.Fill}
      throttle
    >
      {data.length === 0 ? (
        <Grid.EmptyView
          title="No results found"
          description="Try a different search term"
          icon={{ source: Icon.MagnifyingGlass }}
        />
      ) : (
        data.map((anime) => (
          <Grid.Item
            key={anime.id}
            content={anime.main_picture.large}
            title={anime.title}
            subtitle={`${anime.mean ?? "-"}/10`}
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
                  title={anime.isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
                  onAction={async () => {
                    await authorize();
                    if (anime.isInWatchlist) {
                      if (!(await alertRemoveAnime(anime))) return;
                      await removeAnime(anime);
                      clearSearchCache();
                      removeCachedWatchlist();
                      await showHUD("Removed from Watchlist", {
                        popToRootType: PopToRootType.Immediate,
                      });
                    } else {
                      await addAnime(anime);
                      clearSearchCache();
                      removeCachedWatchlist();
                      await showHUD("Added to Watchlist", {
                        popToRootType: PopToRootType.Immediate,
                      });
                    }
                  }}
                  icon={anime.isInWatchlist ? Icon.Xmark : Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "f" }}
                />
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
        ))
      )}
    </Grid>
  );
}
