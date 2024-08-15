import { Grid } from "@raycast/api";
import { DISPLAY_VALUES } from "../../constants";
import { EmptyGameGrid } from "./EmptyGameGrid";
import { GameSummary } from "../../services";
import { GameActions } from "../GameActions";
import { useState } from "react";

/**
 * Defines the props for the GameList component.
 */
interface Props {
  games: GameSummary[];
  isLoading: boolean;
  searchCallback: (query: string) => void;
  searchQuery: string;
}

/**
 * The GameGrid component is responsible for rendering a grid of games
 * and handling the search functionality across them
 *
 * It receives the following props:
 * - games: An array of GameSummary instances to be displayed.
 * - isLoading: A boolean indicating whether the game data is currently being loaded.
 * - searchCallback: A function to be called to trigger a search.
 * - searchQuery: The current search query.
 *
 * The component renders a Grid component from the Raycast API, displaying
 * the game items and using the GameActions and GameDetail components to
 * handle the UI interactions.
 *
 * If there are no games to display, the EmptyGameList component is shown instead.
 */
export function GameGrid({ games, isLoading, searchCallback, searchQuery }: Props): JSX.Element {
  // Track selected item in grid
  const [selectedItem, setSelectedItem] = useState<string | undefined>(undefined);

  return (
    <Grid
      aspectRatio="16/9"
      columns={3}
      filtering={false}
      fit={Grid.Fit.Fill}
      inset={Grid.Inset.Zero}
      isLoading={isLoading}
      navigationTitle={DISPLAY_VALUES.searchTitle}
      onSearchTextChange={searchCallback}
      // When the selection changes, reset the position in grid to the top
      onSelectionChange={() => setSelectedItem(undefined)}
      searchBarPlaceholder={DISPLAY_VALUES.searchPlaceholder}
      searchText={searchQuery}
      selectedItemId={selectedItem}
      throttle={true}
    >
      {games.length > 0 ? (
        games.map((game) => (
          <Grid.Item
            key={game.openUrl}
            title={game.title}
            subtitle={game.publisher}
            actions={<GameActions game={game} isDetailEnabled={true} searchCallback={searchCallback} />}
            content={game.imgUrl}
          />
        ))
      ) : (
        <EmptyGameGrid isLoading={isLoading} isQueryEmpty={!searchQuery || searchQuery.length == 0} />
      )}
    </Grid>
  );
}
