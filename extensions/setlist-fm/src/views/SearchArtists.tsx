import { ActionPanel, Action, List, getPreferenceValues, Icon } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { API } from "../constants/constants";
import { Artist } from "../types/Artist";
import { SearchArtistsResponse } from "../types/SearchArtistsResponse";
import ArtistSetlists from "./ArtistSetlists";

function SearchArtists() {
  const [searchText, setSearchText] = useState("");
  const abortable = useRef<AbortController | null>(null);
  const preferences = getPreferenceValues<{ apiKey: string }>();

  const { isLoading, data, pagination } = usePromise(
    (searchText: string) => async (options: { page: number }) => {
      if (!searchText) return { data: [], hasMore: false };
      const page = options.page + 1;
      const url = `${API.BASE_URL}${API.ARTIST_SEARCH}?artistName=${encodeURIComponent(searchText)}&p=${page}&sort=relevance`;
      const requestOptions = {
        headers: {
          "x-api-key": preferences.apiKey,
          Accept: "application/json",
        },
      };
      let response = await fetch(url, requestOptions);
      if (response.status == 429) {
        // Rate limit exceeded (wait 3 second and retry)
        await new Promise((resolve) => setTimeout(resolve, 3000));
        response = await fetch(url, requestOptions);
      }
      if (response.status == 404) return { data: [], hasMore: false };
      if (!response.ok) {
        showFailureToast(new Error("Failed to fetch artists"), { title: "Could not fetch artists" });
        return { data: [], hasMore: false };
      }
      const json = (await response.json()) as SearchArtistsResponse;
      const artist = json.artist;
      return { data: artist, hasMore: json.total > page * json.itemsPerPage };
    },
    [searchText],
    { abortable },
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Enter artist..."
      onSearchTextChange={setSearchText}
      pagination={pagination}
      throttle
    >
      {data?.map((item: Artist) => (
        <List.Item
          key={`${item.mbid}`}
          title={`${item.name}`}
          subtitle={item.disambiguation}
          actions={
            <ActionPanel>
              <Action.Push title="View Setlists" target={<ArtistSetlists artist={item} />} icon="extension-icon.png" />
              <Action.OpenInBrowser title="View Artist on setlist.fm" url={item.url} icon={Icon.Rocket} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default SearchArtists;
