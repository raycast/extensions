import { List } from "@raycast/api";
import { DISPLAY_VALUES } from "../../constants";
import { EmptyGameList } from "./EmptyGameList";
import { LunaGame } from "../../services";
import { GameDetail } from "./GameDetail";
import { GameActions } from "./GameActions";

/**
 * Defines the props for the GameList component.
 */
interface Props {
  games: LunaGame[];
  isLoading: boolean;
  searchCallback: (query: string) => Promise<void>;
  searchQuery: string;
}

/**
 * The GameList component is responsible for rendering the list of games
 * and handling the search functionality.
 *
 * It receives the following props:
 * - games: An array of LunaGame instances to be displayed.
 * - isLoading: A boolean indicating whether the game data is currently being loaded.
 * - searchCallback: A function to be called when the search text changes.
 * - searchQuery: The current search query.
 *
 * The component renders a List component from the Raycast API, displaying
 * the game items and using the GameActions and GameDetail components to
 * handle the UI interactions.
 *
 * If there are no games to display, the EmptyGameList component is shown instead.
 */
export function GameList({ games, isLoading, searchCallback, searchQuery }: Props): JSX.Element {
  return (
    <List
      isLoading={isLoading}
      isShowingDetail={!isLoading && games.length > 0}
      filtering={false}
      onSearchTextChange={searchCallback}
      searchBarPlaceholder={DISPLAY_VALUES.searchPlaceholder}
      searchText={searchQuery}
      throttle={true}
    >
      {games.length > 0 ? (
        games.map((game) => (
          <List.Item
            key={game.openUrl}
            title={game.title}
            subtitle={game.publisher}
            actions={<GameActions game={game} />}
            detail={<GameDetail game={game} searchCallback={async (genre: string) => await searchCallback(genre)} />}
          />
        ))
      ) : (
        <EmptyGameList isLoading={isLoading} isQueryEmpty={!searchQuery || searchQuery.length == 0} />
      )}
    </List>
  );
}
