import React, { useState } from "react";
import { List, getPreferenceValues } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useSearch } from "./hooks/useSearch";
import { View } from "./components/View";
import { TracksSection } from "./components/TracksSection";
import { AlbumsSection } from "./components/AlbumsSection";
import { ArtistsSection } from "./components/ArtistsSection";
import { PlaylistsSection } from "./components/PlaylistsSection";
import { ShowsSection } from "./components/ShowsSection";
import { EpisodesSection } from "./components/EpisodesSection";

type SearchType = "all" | "tracks" | "albums" | "artists" | "playlists" | "shows" | "episodes";

interface SearchPreferences {
  musicOnly: boolean;
  topView: "playlists" | "albums" | "artists" | "tracks" | "shows" | "episodes";
}

export default function SearchCommand() {
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useCachedState<SearchType>("selected-search-category", "all");
  const preferences = getPreferenceValues<SearchPreferences>();

  const { searchData, searchIsLoading } = useSearch({
    query: searchText,
    options: {
      execute: Boolean(searchText),
      keepPreviousData: true,
    },
  });

  const searchDropdownOptions = [
    { title: "All", value: "all" },
    { title: "Artists", value: "artists" },
    { title: "Albums", value: "albums" },
    { title: "Songs", value: "tracks" },
    ...(preferences.musicOnly
      ? []
      : [
          { title: "Playlists", value: "playlists" },
          { title: "Podcasts & Shows", value: "shows" },
          { title: "Episodes", value: "episodes" },
        ]),
  ];

  const shouldShowSection = (sectionType: SearchType) => {
    if (
      preferences.musicOnly &&
      (sectionType === "shows" || sectionType === "episodes" || sectionType === "playlists")
    ) {
      return false;
    }
    return selectedCategory === "all" || selectedCategory === sectionType;
  };

  const getSectionOrder = () => {
    const sections = [];

    // Add the top view first if showing all
    if (selectedCategory === "all" && preferences.topView) {
      sections.push(preferences.topView);
    }

    // Add other sections in order
    const otherSections = ["artists", "albums", "tracks", "playlists", "shows", "episodes"].filter(
      (section) => section !== preferences.topView || selectedCategory !== "all",
    );

    return [...sections, ...otherSections];
  };

  const renderSection = (sectionType: string) => {
    switch (sectionType) {
      case "artists":
        if (shouldShowSection("artists") && searchData?.artists?.items?.length) {
          return <ArtistsSection type="list" artists={searchData.artists.items} limit={3} />;
        }
        break;
      case "albums":
        if (shouldShowSection("albums") && searchData?.albums?.items?.length) {
          return <AlbumsSection type="list" albums={searchData.albums.items} limit={4} />;
        }
        break;
      case "tracks":
        if (shouldShowSection("tracks") && searchData?.tracks?.items?.length) {
          return <TracksSection title="Songs" tracks={searchData.tracks.items} limit={4} />;
        }
        break;
      case "playlists":
        if (shouldShowSection("playlists") && searchData?.playlists?.items?.length) {
          return <PlaylistsSection type="list" playlists={searchData.playlists.items} limit={4} />;
        }
        break;
      case "shows":
        if (shouldShowSection("shows") && searchData?.shows?.items?.length) {
          return <ShowsSection type="list" shows={searchData.shows.items} limit={4} />;
        }
        break;
      case "episodes":
        if (shouldShowSection("episodes") && searchData?.episodes?.items?.length) {
          return <EpisodesSection episodes={searchData.episodes.items} title="Episodes" limit={4} />;
        }
        break;
    }
    return null;
  };

  return (
    <View>
      <List
        isLoading={searchIsLoading}
        onSearchTextChange={setSearchText}
        searchBarPlaceholder="Search artists, albums, songs, playlists, podcasts..."
        searchBarAccessory={
          <List.Dropdown
            tooltip="Select Category"
            storeValue={true}
            onChange={(newValue) => setSelectedCategory(newValue as SearchType)}
          >
            {searchDropdownOptions.map((option) => (
              <List.Dropdown.Item key={option.value} title={option.title} value={option.value} />
            ))}
          </List.Dropdown>
        }
      >
        {searchText && !searchIsLoading && !searchData && (
          <List.EmptyView title="No results found" description={`No results found for "${searchText}"`} />
        )}

        {!searchText && (
          <List.EmptyView
            title="Search Spotify"
            description="Enter a search term to find artists, albums, songs, playlists, podcasts, and episodes"
          />
        )}

        {searchData &&
          getSectionOrder().map((sectionType) => (
            <React.Fragment key={sectionType}>{renderSection(sectionType)}</React.Fragment>
          ))}
      </List>
    </View>
  );
}
