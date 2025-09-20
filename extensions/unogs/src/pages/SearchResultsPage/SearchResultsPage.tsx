import { useState, useEffect } from "react";
import { List, Icon, showToast, ActionPanel, Action, Toast } from "@raycast/api";

import { getTitleCountries, searchTitle } from "../../api";
import { SearchItem, SearchResults, TitleCountries } from "../../models";
import { detailMarkDown } from "../../utils";

export const SearchResultsPage = (props: { title: string }) => {
  const [data, setData] = useState<SearchResults>();
  const [currentTitleCountries, setCurrentTitleCountries] = useState<TitleCountries>();
  const [loading, setLoading] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [showingDetails, setShowingDetails] = useState(false);

  useEffect(() => {
    setLoading(true);
    searchTitle(props.title)
      .then((data: SearchResults) => setData(data))
      .catch((error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: error.message || "Something went wrong",
        });
      })
      .finally(() => setLoading(false));
  }, [props.title]);

  const handleSelect = (idx?: string) => {
    setCurrentTitleCountries(undefined);

    if (idx && data && data.results) {
      const netflixId = data.results[parseInt(idx, 10)].netflix_id;
      if (netflixId) {
        setIsLoadingDetails(true);
        getTitleCountries(netflixId)
          .then((data: TitleCountries) => setCurrentTitleCountries(data))
          .finally(() => setIsLoadingDetails(false));
      }
    }
  };

  return (
    <List
      isLoading={loading}
      isShowingDetail={showingDetails}
      onSelectionChange={handleSelect}
      searchBarPlaceholder="Filter by title, year or imdb ID"
    >
      {!data?.results && <List.EmptyView icon={Icon.MagnifyingGlass} title="No results for given title." />}
      {data?.results &&
        data.results.map((result: SearchItem, idx: number) => {
          const props: Partial<List.Item.Props> = showingDetails
            ? {
                detail: (
                  <List.Item.Detail
                    isLoading={isLoadingDetails}
                    markdown={detailMarkDown(result, currentTitleCountries?.results)}
                  />
                ),
              }
            : { subtitle: result.title_date };

          return (
            <List.Item
              key={result.netflix_id}
              id={idx.toString()}
              icon={result.title_type === "movie" ? "🎬" : "📺"}
              title={result.title}
              accessories={[{ text: result.year, icon: Icon.Calendar }]}
              keywords={[result.title, result.imdb_id, result.year, result.synopsis]}
              actions={
                <ActionPanel>
                  <Action icon={Icon.List} title="Show Details" onAction={() => setShowingDetails(!showingDetails)} />
                  <Action.OpenInBrowser url={`https://www.netflix.com/title/${result.netflix_id}`} />
                </ActionPanel>
              }
              {...props}
            />
          );
        })}
    </List>
  );
};
