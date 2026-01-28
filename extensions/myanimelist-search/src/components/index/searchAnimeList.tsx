import { Action, ActionPanel, Icon, Image, List, PopToRootType, getPreferenceValues, showHUD } from "@raycast/api";
import { useContext, useState } from "react";

import { addAnime, alertRemoveAnime, removeAnime, removeCachedWatchlist } from "../../api/api";
import { authorize } from "../../api/oauth";
import useSearch from "../../api/useSearch";
import AnimeDetails from "../listDetail";
import { ViewTypeCtx } from "../ViewTypeCtx";

export default function SearchAnimeList() {
  const preferences = getPreferenceValues();
  const showDetailDefault = preferences.view;
  const { setViewType } = useContext(ViewTypeCtx);
  const [searchText, setSearchText] = useState("");
  const [showingDetail, setShowingDetail] = useState(showDetailDefault === "list-detailed");
  const { isLoading, items: data, clearCache: clearSearchCache } = useSearch({ q: searchText });

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
      isShowingDetail={showingDetail}
    >
      {data.length === 0 ? (
        <List.EmptyView title="No results found" description="Try a different search term" />
      ) : (
        data.map((anime) => {
          const startYear = anime.start_date ? new Date(anime.start_date).getFullYear().toString() : "-";

          const props = showingDetail
            ? {
                detail: <AnimeDetails anime={anime} />,
              }
            : { accessories: [{ tag: anime.mean?.toString() || "-" }] };
          const takenSpace = anime.title?.length + startYear.length + 4;

          return (
            <List.Item
              key={anime.id}
              title={anime.title}
              icon={{
                source: anime.main_picture.medium,
                mask: Image.Mask.Circle,
              }}
              subtitle={
                !showingDetail
                  ? `(${startYear})  ${anime.synopsis?.slice(0, 92 - takenSpace) || ""}${
                      anime.synopsis?.length > 92 ? "..." : ""
                    }`
                  : ""
              }
              {...props}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={`https://myanimelist.net/anime/${anime.id}`} />
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
          );
        })
      )}
    </List>
  );
}
