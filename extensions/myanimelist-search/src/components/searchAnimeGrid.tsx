import { useState } from "react";
import { ActionPanel, Action, Grid, Icon, showHUD, PopToRootType } from "@raycast/api";
import useSearch from "../api/useSearch";
import { addAnime, cacheRemove, removeAnime, removeCachedWatchlist } from "../api/api";
import { authorize } from "../api/oauth";

export default function SearchAnimeGrid() {
  const [searchText, setSearchText] = useState("");
  const { isLoading, items: data, clearCache: clearSearchCache } = useSearch({ q: searchText });

  return (
    <Grid
      isLoading={isLoading}
      columns={5}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      aspectRatio="2/3"
      fit={Grid.Fit.Fill}
    >
      {!isLoading &&
        data.map((anime) => (
          <Grid.Item
            key={anime.id}
            content={anime.main_picture.large}
            title={anime?.title}
            subtitle={`${anime.mean ?? "-"}/10`}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`https://myanimelist.net/anime/${anime.id}`} />
                <Action
                  title={anime.isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
                  onAction={async () => {
                    await authorize();
                    if (anime.isInWatchlist) {
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
        ))}
    </Grid>
  );
}
