import { useState, useEffect, useMemo } from "react";
import { List } from "@raycast/api";
import { searchTitles } from "./utils/requests";
import SearchBarAccessory from "./components/SearchBarAccessory";
import { Media, MediaDetails } from "./types";
import MediaListItem from "./components/MediaListItem";
import { showFailureToast } from "@raycast/utils";

interface SearchMediaProps {
  arguments: {
    search: string;
  };
}

export default function SearchByTitle(props: SearchMediaProps) {
  const [searchText, setSearchText] = useState(props.arguments.search || "");
  const [loading, setLoading] = useState(false);
  const [titles, setTitles] = useState<Media[]>([]);
  const [viewType, setViewType] = useState("all");

  const onSearch = async (search: string) => {
    setLoading(true);
    setSearchText(search);
    if (!search) {
      setTitles([]);
      setLoading(false);
      return;
    }

    try {
      const response = await searchTitles(search, viewType);
      // Extract the Search array from the response data
      setTitles(response.Search || []);
    } catch (error) {
      showFailureToast(error, { title: "Failed to search titles" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchText) {
      onSearch(searchText);
    }
  }, [viewType, searchText]);

  const { groupedByYearAndType, yearsInOrder } = useMemo(() => {
    const grouped: { [key: string]: { [key: string]: Media[] } } = {};
    const years: string[] = [];

    titles?.forEach((title) => {
      if (!grouped[title.Year]) {
        grouped[title.Year] = {};
        years.push(title.Year);
      }
      if (!grouped[title.Year][title.Type]) {
        grouped[title.Year][title.Type] = [];
      }
      grouped[title.Year][title.Type].push(title);
    });

    return { groupedByYearAndType: grouped, yearsInOrder: years };
  }, [titles]);

  return (
    <List
      isLoading={loading}
      throttle={true}
      searchText={searchText}
      onSearchTextChange={onSearch}
      isShowingDetail={true}
      searchBarPlaceholder={"Search for a Movie, TV Show, or Game..."}
      searchBarAccessory={<SearchBarAccessory viewType={viewType} setViewType={setViewType} />}
    >
      {yearsInOrder.length > 0 ? (
        yearsInOrder?.map((year) =>
          Object.keys(groupedByYearAndType[year]).map((type) => (
            <List.Section key={`${year}-${type}`} title={year} subtitle={type.charAt(0).toUpperCase() + type.slice(1)}>
              {groupedByYearAndType[year][type]?.map((title) => {
                // Validate title has required MediaDetails fields before rendering
                const isValidMediaDetails = title && title.Title && title.imdbID && title.Year && title.Poster;

                return isValidMediaDetails ? <MediaListItem key={title.imdbID} title={title as MediaDetails} /> : null;
              })}
            </List.Section>
          )),
        )
      ) : (
        <List.EmptyView
          title={searchText && !loading ? "No Results Found" : "Search for Media!"}
          description={
            searchText && !loading
              ? "We couldn't find that movie, TV show, or game"
              : "You can search for movies, TV shows, or games to find ratings"
          }
        />
      )}
    </List>
  );
}
