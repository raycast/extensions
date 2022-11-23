import { ActionPanel, List, Action, Image, Icon, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { useFetch } from "@raycast/utils";
import type { Result } from "../src/types";

export default function SearchAnimeList() {
  const [page, setPage] = useState("1");
  const preferences = getPreferenceValues();
  const showDetailDefault = preferences.view;
  const shouldHideNSFW = preferences.hide_nsfw ? "&sfw" : "";
  const [searchText, setSearchText] = useState("");
  const [showingDetail, setShowingDetail] = useState(showDetailDefault == "list-detailed");
  const { isLoading, data } = useFetch<Result>(
    searchText
      ? `https://api.jikan.moe/v4/anime?q=${searchText}&page=${page}${shouldHideNSFW}`
      : `https://api.jikan.moe/v4/seasons/now?page=${page}`,
    {
      // to make sure the screen isn't flickering when the searchText changes
      keepPreviousData: true,
    }
  );

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
      isShowingDetail={showingDetail}
      searchBarAccessory={
        <List.Dropdown tooltip="Page Number" onChange={(newValue) => setPage(newValue)} storeValue>
          <List.Dropdown.Section title="Pages">
            {Array.from(Array(data?.pagination.last_visible_page).keys()).map((i) => (
              <List.Dropdown.Item key={i} title={`Page ${i + 1}`} value={`${i + 1}`} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {(data?.data?.filter((anime: Result["data"][0]) => anime.approved) || []).map((anime: Result["data"][0]) => {
        const props: Partial<List.Item.Props> = showingDetail
          ? {
              detail: (
                <List.Item.Detail
                  markdown={`## ${anime.title}\n​<img src="${anime.images.webp.image_url}" height="200"/>\n\n${
                    anime.synopsis || ""
                  }`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Type" text={anime.type || "-"} />
                      <List.Item.Detail.Metadata.Label title="Episodes" text={anime.episodes?.toString() || "-"} />
                      <List.Item.Detail.Metadata.Label title="Score" text={anime.score?.toString() || "-"} />
                      <List.Item.Detail.Metadata.Label
                        title="Ranked"
                        text={anime.rank ? `#${anime.rank?.toString()}` : "-"}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Year"
                        text={anime.aired.prop.from.year?.toString() || "-"}
                      />
                      <List.Item.Detail.Metadata.TagList title="Genres">
                        {(anime?.genres || []).map((genre) => (
                          <List.Item.Detail.Metadata.TagList.Item
                            text={genre.name}
                            color={"#E2E7F4"}
                            key={genre.name}
                          />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    </List.Item.Detail.Metadata>
                  }
                />
              ),
            }
          : { accessories: [{ text: anime.score?.toString() || "-" }] };
        const takenSpace = anime.title?.length + anime.aired.prop.from.year?.toString().length + 4;

        return (
          <List.Item
            key={anime.mal_id}
            title={anime.title}
            icon={{
              source: anime.images.jpg.small_image_url,
              mask: Image.Mask.Circle,
            }}
            subtitle={
              !showingDetail
                ? `(${anime.aired.prop.from.year || "-"})  ${anime.synopsis?.slice(0, 92 - takenSpace) || ""}${
                    anime.synopsis?.length > 92 ? "..." : ""
                  }`
                : ""
            }
            {...props}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={anime.url} />
                <Action
                  title="Toggle Detailed view"
                  onAction={() => setShowingDetail(!showingDetail)}
                  icon={Icon.AppWindowSidebarLeft}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
