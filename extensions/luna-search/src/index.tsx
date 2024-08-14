import {
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";
import { LunaGame, LunaService } from "./services";
import { GameList } from "./components";
import { DISPLAY_VALUES } from "./constants";

// Create a singleton instance of the LunaService to handle game searches
const LUNA = new LunaService();

export default function Command() {
  const [games, setGames] = useState<LunaGame[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  /**
   * Performs a search for games on the Amazon Luna platform based on the provided query.
   * If the query is empty, it clears the games list. Otherwise, it updates the loading state
   * and fetches the games from the LunaService. If an error occurs, it displays a failure
   * toast message.
   *
   * @param query The search query to use.
   */
  const searchGames = async (query: string): Promise<void> => {
    setSearchQuery(query);

    if (!query) {
      setGames([]);
      return;
    }

    setIsLoading(true);

    try {
      const games = await LUNA.search(query)
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

  // Render the GameList component, which is responsible for displaying the game list.
  // The GameList component receives the games, isLoading, searchCallback, and searchQuery
  // props from the Command component.
  return <GameList games={games} isLoading={isLoading} searchCallback={searchGames} searchQuery={searchQuery} />
}
