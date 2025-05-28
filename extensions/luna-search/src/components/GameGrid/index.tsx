import { Grid } from "@raycast/api";
import { DISPLAY_VALUES } from "../../constants";
import { EmptyGameGrid } from "./EmptyGameGrid";
import { GameSummary } from "../../models";
import { GameGridActions } from "../Actions";
import { useEffect, useState } from "react";
import { SearchCallback } from "../..";

/**
 * The default size of each page in the game grid.
 */
const PAGE_SIZE = 15;

/**
 * Defines the props for the GameGrid component.
 */
interface Props {
  /**
   * The array of GameSummary instances to be displayed in the grid.
   */
  games: GameSummary[];

  /**
   * A boolean indicating whether the game data is currently being loaded.
   */
  isLoading?: boolean;

  /**
   * A callback function to execute a search.
   */
  searchCallback: SearchCallback;

  /**
   * The current search query.
   */
  term: string;
}

/**
 * Cuts an array of Game objects into subarrays of a specified size.
 *
 * @param games - The array of Game objects to be cut.
 * @param pageSize - The desired size of each subarray. Defaults to 10 if not provided.
 * @returns An array of subarrays, each containing up to `pageSize` Game objects.
 */
function getPages(games: GameSummary[], pageSize: number = 10): PagedGames {
  const gamePages = games.reduce<GameSummary[][]>((pages, game, index) => {
    const pageIndex = Math.floor(index / pageSize);
    if (!pages[pageIndex]) {
      pages[pageIndex] = [];
    }
    pages[pageIndex].push(game);
    return pages;
  }, []);

  return {
    currentPage: 0,
    gamePages,
    isLastPage: gamePages.length <= 1,
  };
}

interface PagedGames {
  currentPage: number;
  gamePages: GameSummary[][];
  isLastPage: boolean;
}

/**
 * The GameGrid component is responsible for rendering a grid of games
 * and handling the search functionality across them.
 *
 * It receives the following props:
 * - games: An array of GameSummary instances to be displayed.
 * - isLoading: A boolean indicating whether the game data is currently being loaded.
 * - searchCallback: A function to be called to trigger a search.
 * - searchQuery: The current search query.
 *
 * The component renders a Grid component from the Raycast API, displaying
 * the game items and using the GameGridActions component to handle the UI
 * interactions.
 *
 * If there are no games to display, the EmptyGameGrid component is shown instead.
 * The component also supports pagination, loading more games as the user scrolls.
 */
export function GameGrid({ games, isLoading, searchCallback, term }: Props): JSX.Element {
  // Track selected item in grid
  const [gamePages, setGamePages] = useState<PagedGames>({ currentPage: 0, gamePages: [], isLastPage: true });
  const [displayedGames, setDisplayedGames] = useState<GameSummary[]>([]);

  useEffect(() => {
    const pagedGames = getPages(games, PAGE_SIZE);
    setGamePages(pagedGames); // Set total pages
    setDisplayedGames(pagedGames.gamePages[0] ?? []); // Set to first page
  }, [games]);

  /**
   * Loads the next page of games and updates the displayedGames state.
   */
  function loadMore() {
    // Built in hasMore feature is not always respected.
    if (gamePages.isLastPage) {
      return;
    }
    const nextPageId = gamePages.currentPage + 1;
    const isLastPage = nextPageId >= gamePages.gamePages.length - 1;
    setGamePages({ ...gamePages, isLastPage, currentPage: nextPageId });
    setDisplayedGames([...displayedGames, ...gamePages.gamePages[nextPageId]]);
  }

  return (
    <Grid
      aspectRatio="16/9"
      columns={3}
      filtering={false}
      fit={Grid.Fit.Fill}
      inset={Grid.Inset.Zero}
      isLoading={isLoading}
      navigationTitle={DISPLAY_VALUES.searchTitle}
      pagination={{
        hasMore: !gamePages.isLastPage,
        pageSize: PAGE_SIZE,
        onLoadMore: loadMore,
      }}
      onSearchTextChange={(search) => searchCallback({ query: search })}
      searchBarPlaceholder={DISPLAY_VALUES.searchPlaceholder}
      searchText={term}
      throttle={true}
    >
      {displayedGames.length > 0 ? (
        displayedGames.map((game) => (
          <Grid.Item
            key={game.openUrl}
            title={game.title}
            subtitle={game.publisher}
            actions={<GameGridActions game={game} searchCallback={searchCallback} />}
            content={game.imgUrl}
          />
        ))
      ) : (
        <EmptyGameGrid isLoading={isLoading} query={term} searchCallback={searchCallback} />
      )}
    </Grid>
  );
}
