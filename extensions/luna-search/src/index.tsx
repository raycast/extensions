import { LaunchProps } from "@raycast/api";
import { useState } from "react";
import { GameGrid } from "./components";
import { useSearch, useTrendingGames } from "./hooks";

/**
 * Defines the shape of the search input, which can include a query string and/or a flag to indicate a search for trending games.
 */
export interface SearchInput {
  /**
   * The search query string.
   */
  query?: string;

  /**
   * A flag indicating whether to search for trending games.
   */
  isTrending?: boolean;
}

/**
 * Defines a general type for the search callback function, which is used to update the search input.
 */
export type SearchCallback = (input: SearchInput) => void;

/**
 * The main command component for the Raycast extension.
 * This component is responsible for managing the search functionality and rendering the appropriate game grid.
 *
 * @param props The launch props provided by the Raycast API, including the search arguments.
 * @returns A JSX.Element representing the main command.
 */
export default function Command(props: LaunchProps<{ arguments: Arguments.Index }>) {
  const [searchQuery, setSearchQuery] = useState<SearchInput>({ query: props.arguments.search ?? "" });
  const [previousSearchTerm, setPreviousSearchTerm] = useState<string | undefined>(searchQuery.query);
  const [searchResults, searchLoading] = useSearch(searchQuery.query, previousSearchTerm);
  const [trending, trendingLoading] = useTrendingGames();

  // Handle search events by recording the previous search (used by useSearch) and updating the current.
  const searchCallback = (input: SearchInput) => {
    // Needs to happen before setting the search.
    if (searchQuery.query) {
      setPreviousSearchTerm(searchQuery.query);
    }
    setSearchQuery(input);
  };
  /**
   * Renders the appropriate game grid based on the current search input.
   * If the isTrending flag is set, the trending games are displayed.
   * Otherwise, the search results are displayed.
   */
  return searchQuery.isTrending ? (
    <GameGrid games={trending} isLoading={trendingLoading} searchCallback={searchCallback} term={""} />
  ) : (
    <GameGrid
      games={searchResults}
      isLoading={searchLoading}
      searchCallback={searchCallback}
      term={searchQuery.query ?? ""}
    />
  );
}
