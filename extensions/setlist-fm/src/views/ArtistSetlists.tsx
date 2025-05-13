import { ActionPanel, Action, List, getPreferenceValues, Icon } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { API } from "../constants/constants";
import { Artist } from "../types/Artist";
import { SearchSetlistResponse } from "../types/SearchSetlistResponse";
import getFlagPrefix from "../helper/getFlag";
import SetListDetail from "./SetListDetail";

enum SearchFilter {
  NONE = "none",
  YEAR = "year",
  CITY = "city",
  TOUR = "tour",
}

function ArtistSetlists({ artist }: { artist: Artist }) {
  const [searchFilter, setSearchFilter] = useState<string>(SearchFilter.NONE);
  const [searchText, setSearchText] = useState("");
  const abortable = useRef<AbortController | null>(null);
  const preferences = getPreferenceValues<{ apiKey: string }>();

  const allFilters = [
    { filter: SearchFilter.NONE, title: "-" },
    { filter: SearchFilter.YEAR, title: "Filter by year" },
    { filter: SearchFilter.CITY, title: "Filter by city" },
    { filter: SearchFilter.TOUR, title: "Filter by tour" },
  ];

  const getPlaceHolderTitle = () => {
    if (searchFilter == SearchFilter.YEAR) {
      return "Filter by year";
    } else if (searchFilter == SearchFilter.CITY) {
      return "Filter by city";
    } else if (searchFilter == SearchFilter.TOUR) {
      return "Filter by tour name";
    }
    return "Filter results";
  };

  const { isLoading, data, pagination } = usePromise(
    (searchText: string, artist: Artist) => async (options: { page: number }) => {
      const page = options.page + 1;
      let url = `${API.BASE_URL}${API.SETLIST_SEARCH}?artistMbid=${artist.mbid}&p=${page}`;
      if (searchText) {
        if (searchFilter == SearchFilter.YEAR) {
          url += `&year=${searchText}`;
        } else if (searchFilter == SearchFilter.CITY) {
          url += `&cityName=${searchText}`;
        } else if (searchFilter == SearchFilter.TOUR) {
          url += `&tourName=${searchText}`;
        }
      }
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
        showFailureToast(new Error("Failed to fetch setlists"), { title: "Could not fetch setlists" });
        return { data: [], hasMore: false };
      }
      const json = (await response.json()) as SearchSetlistResponse;
      const setlists = json.setlist.filter((setlist) => setlist.sets.set.length);
      return { data: setlists, hasMore: json.total > page * json.itemsPerPage };
    },
    [searchText, artist],
    { abortable },
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={getPlaceHolderTitle()}
      onSearchTextChange={searchFilter == SearchFilter.NONE ? undefined : setSearchText}
      pagination={pagination}
      throttle
      navigationTitle={artist.name}
      filtering={searchFilter == SearchFilter.NONE}
      searchBarAccessory={
        <List.Dropdown tooltip="Select filter" onChange={(newValue) => setSearchFilter(newValue)}>
          {allFilters.map((filter) => (
            <List.Dropdown.Item key={filter.filter} value={filter.filter} title={`${filter.title}`} />
          ))}
        </List.Dropdown>
      }
    >
      {data?.map((setlist) => (
        <List.Item
          key={setlist.id}
          title={`${getFlagPrefix(setlist.venue.city.country.code)}${setlist.venue.city.name} / ${setlist.venue.name}`}
          subtitle={setlist.eventDate}
          accessories={setlist.tour?.name ? [{ text: setlist.tour.name }] : undefined}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Setlist"
                target={<SetListDetail setlist={setlist} />}
                icon="extension-icon.png"
              />
              <Action.OpenInBrowser title="View on setlist.fm" url={setlist.url} icon={Icon.Rocket} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default ArtistSetlists;
