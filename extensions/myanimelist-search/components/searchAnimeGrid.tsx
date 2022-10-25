import { useState } from "react";
import { ActionPanel, Action, Grid, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import type { Result } from "../src/types";

export default function SearchAnimeGrid() {
  const [page, setPage] = useState("1");
  const preferences = getPreferenceValues();
  const shouldHideNSFW = preferences.hide_nsfw ? "&sfw" : "";
  const [searchText, setSearchText] = useState("");
  const { isLoading, data } = useFetch<Result>(
    searchText
      ? `https://api.jikan.moe/v4/anime?q=${searchText}&page=${page}${shouldHideNSFW}`
      : `https://api.jikan.moe/v4/seasons/now?page=${page}`,
    { keepPreviousData: true }
  );

  return (
    <Grid
      isLoading={isLoading}
      itemSize={Grid.ItemSize.Medium}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Page Number" onChange={(newValue) => setPage(newValue)} storeValue>
          <Grid.Dropdown.Section title="Pages">
            {Array.from(Array(data?.pagination?.last_visible_page).keys()).map((i) => (
              <Grid.Dropdown.Item key={i} title={`Page ${i + 1}`} value={`${i + 1}`} />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {!isLoading &&
        (data?.data?.filter((anime: Result["data"][0]) => anime.approved) || []).map((anime: Result["data"][0]) => (
          <Grid.Item
            key={anime?.mal_id}
            content={anime?.images?.jpg?.image_url}
            title={anime?.title}
            subtitle={`${anime?.score || "-"}/10`}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={anime?.url} />
              </ActionPanel>
            }
          />
        ))}
    </Grid>
  );
}
