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
  const [searchResults, searchLoading] = useSearch(searchQuery.query);
  const [trending, trendingLoading] = useTrendingGames();

  /**
   * Renders the appropriate game grid based on the current search input.
   * If the isTrending flag is set, the trending games are displayed.
   * Otherwise, the search results are displayed.
   */
  return searchQuery.isTrending ? (
    <GameGrid games={trending} isLoading={trendingLoading} searchCallback={setSearchQuery} term={""} />
  ) : (
    <GameGrid
      games={searchResults}
      isLoading={searchLoading}
      searchCallback={setSearchQuery}
      term={searchQuery.query ?? ""}
    />
  );
}
