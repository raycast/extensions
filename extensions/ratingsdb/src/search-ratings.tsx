import { useState, useEffect } from "react";
import { List } from "@raycast/api";
import { searchTitles } from "./utils/requests";
import SearchBarAccessory from "./components/SearchBarAccessory";
import { Media, MediaDetails } from "./types";
import MediaListItem from "./components/MediaListItem";
import { sortTitles } from "./utils";

interface SearchByTitleProps {
  searchQuery?: string;
}

export default function SearchByTitle({ searchQuery }: SearchByTitleProps) {
  const [searchText, setSearchText] = useState(searchQuery || "");
  const [loading, setLoading] = useState(false);
  const [titles, setTitles] = useState<Media[]>([]);
  const [sortOrder] = useState("none");
  const [viewType, setViewType] = useState("all");

  const onSearch = async (search: string) => {
    setLoading(true);
    setSearchText(search);
    if (!search) {
      setLoading(false);
      return;
    }

    searchTitles(search, viewType).then((titles) => {
      setTitles(titles);
      setLoading(false);
    });
  };

  useEffect(() => {
    if (searchText) {
      onSearch(searchText);
    }
  }, [viewType]);

  const sortedTitles = sortTitles(titles, sortOrder);

  const groupedByYearAndType: { [key: string]: { [key: string]: Media[] } } = {};
  const yearsInOrder: string[] = [];

  sortedTitles?.forEach((title) => {
    if (!groupedByYearAndType[title.Year]) {
      groupedByYearAndType[title.Year] = {};
      yearsInOrder.push(title.Year);
    }
    if (!groupedByYearAndType[title.Year][title.Type]) {
      groupedByYearAndType[title.Year][title.Type] = [];
    }
    groupedByYearAndType[title.Year][title.Type].push(title);
  });

  return (
    <List
      isLoading={loading}
      throttle={true}
      searchText={searchText}
      onSearchTextChange={onSearch}
      isShowingDetail={true}
      searchBarPlaceholder={"Search for a Movie or Show..."}
      searchBarAccessory={<SearchBarAccessory viewType={viewType} setViewType={setViewType} />}
    >
      {yearsInOrder.length > 0 ? (
        yearsInOrder?.map((year) =>
          Object.keys(groupedByYearAndType[year]).map((type) => (
            <List.Section key={`${year}-${type}`} title={year} subtitle={type.charAt(0).toUpperCase() + type.slice(1)}>
              {groupedByYearAndType[year][type]?.map((title) => (
                <MediaListItem key={title.imdbID} title={title as MediaDetails} />
              ))}
            </List.Section>
          )),
        )
      ) : (
        <List.EmptyView
          title={searchText && !loading ? "No Results Found" : "Enter a Movie or Show Name"}
          description={
            searchText && !loading
              ? "We couldn't find that movie or show"
              : "Search for a movie or show to find out what ratings it has"
          }
        />
      )}
    </List>
  );
}
