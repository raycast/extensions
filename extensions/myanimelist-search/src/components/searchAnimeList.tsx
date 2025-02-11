import { ActionPanel, List, Action, Image, Icon, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import useSearch from "../api/useSearch";
import AnimeDetails from "./listDetail";

export default function SearchAnimeList() {
  const preferences = getPreferenceValues();
  const showDetailDefault = preferences.view;
  const [searchText, setSearchText] = useState("");
  const [showingDetail, setShowingDetail] = useState(showDetailDefault == "list-detailed");
  const { isLoading, items: data } = useSearch({ q: searchText });

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
      isShowingDetail={showingDetail}
    >
      {data.map((anime) => {
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
      })}
    </List>
  );
}
