import axios from "axios";
import { API_ROUTE } from "./constants";
import { isEmpty, Search } from "./SearchModel";
import { Response } from "./ReponseModel";
import { GameSummary } from "./GameSummary";
import { ExpiringCache } from "../../utilities";
import { Game } from "./Game";
import { GetGame } from "./GetGameModel";

/**
 * Provides a service for interacting with the Luna API, including
 * searching for games and processing the API response.
 */
export class LunaService {
  private readonly gameCache: ExpiringCache<Game>;
  private readonly searchCache: ExpiringCache<GameSummary[]>;
  private readonly url: string;

  private static instance: LunaService;

  /**
   * Constructs a new instance of the LunaService.
   * The API route can be provided as a parameter, but defaults to the API_ROUTE constant.
   *
   * @param url The base URL for the Luna API endpoint.
   */
  private constructor(url: string = API_ROUTE) {
    this.gameCache = new ExpiringCache<Game>();
    this.searchCache = new ExpiringCache<GameSummary[]>();
    this.url = url;
  }

  /**
   * Retrieves / creates a singleton instance of LunaService for use.
   *
   * @returns The singleton instance of LunaService.
   */
  public static getInstance(): LunaService {
    if (!LunaService.instance) {
      LunaService.instance = new LunaService();
    }
    return LunaService.instance;
  }

  public async getGameDetails(game: GameSummary): Promise<Game> {
    const cachedGame = this.gameCache.get(game.title);
    if (cachedGame) {
      return cachedGame;
    }

    const request = new GetGame(game);
    const response = await axios.post<Response>(this.url, request.body, { headers: request.headers });
    const result = new Game(response.data);
    this.gameCache.set(game.title, result);
    return result;
  }

  /**
   * Performs a search for games on the Luna platform using the provided query.
   * The method creates a Search instance, sends the request to the Luna API,
   * and processes the response to extract the game data.
   *
   * @param query The search query to use.
   * @returns An array of GameSummary instances matching the search query.
   */
  public async search(query: string): Promise<GameSummary[]> {
    const cachedGames = this.searchCache.get(query);
    if (cachedGames) {
      return cachedGames;
    }

    const request = new Search(query);

    const response = await axios.post<Response>(this.url, request.body, { headers: request.headers });

    if (!response?.data || isEmpty(response.data)) {
      this.searchCache.set(query, []);
      return [];
    }

    const results = response.data.pageMemberGroups.mainContent.widgets
      .flatMap((widget) => widget.widgets)
      .map((widget) => new GameSummary(widget));

    this.searchCache.set(query, results);
    return results;
  }
}

/**
 * Re-exports the GameSummary class from the GameModel file,
 * making it accessible from the LunaService module.
 */
export { GameSummary } from "./GameSummary";
