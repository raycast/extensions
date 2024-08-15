import { LaunchProps, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { GameSummary, LunaService } from "./services";
import { GameGrid } from "./components";
import { DISPLAY_VALUES } from "./constants";

// Create a singleton instance of the LunaService to handle game searches
const LUNA = LunaService.getInstance();

export interface SearchInput {
  query?: string;
  isTrending?: boolean;
}
export type SearchCallback = (input: SearchInput) => void;

export default function Command(props: LaunchProps<{ arguments: Arguments.Index }>) {
  const [games, setGames] = useState<GameSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>(props.arguments.search ?? "");
  // Prevent loading flashes by defaulting on loading state if there is a default search
  const [isLoading, setIsLoading] = useState<boolean>(props.arguments.search != "" || false);

  /**
   * Performs a search for games on the Amazon Luna platform based on the provided query.
   * If the query is empty, it clears the games list. Otherwise, it updates the loading state
   * and fetches the games from the LunaService. If an error occurs, it displays a failure
   * toast message.
   *
   * @param query The search query to use.
   */
  const searchGames = async (input: SearchInput): Promise<void> => {
    const query = input.query || "";
    setSearchQuery(query);

    if (!input.query && !input.isTrending) {
      setGames([]);
      return;
    }

    setIsLoading(true);

    const loader = input.isTrending ? async () => await LUNA.getTrendingGames() : async () => await LUNA.search(query);
    try {
      const games = await loader();
      setGames(games);
    } catch (err) {
      console.debug("Error fetching games:", err);
      setGames([]);
      showToast({
        style: Toast.Style.Failure,
        title: DISPLAY_VALUES.errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger a search if there was an inital state for the search query.
  useEffect(() => {
    if (searchQuery != null) {
      searchGames({ query: searchQuery });
    }
  }, []);

  // Render the GameGrid component, which is responsible for displaying the game results.
  // The GameGrid component receives the games, isLoading, searchCallback, and searchQuery
  // props from the Command component.
  return <GameGrid games={games} isLoading={isLoading} searchCallback={searchGames} searchQuery={searchQuery} />;
}
