import axios from "axios";
import { API_ROUTE } from "./constants";
import { isEmpty, Search } from "./SearchModel";
import { Response } from "./ReponseModel";
import { LunaGame } from "./GameModel";
import { ExpiringCache } from "../../utilities";

/**
 * Provides a service for interacting with the Luna API, including
 * searching for games and processing the API response.
 */
export class LunaService {
  private readonly cache: ExpiringCache<LunaGame[]>;
  private readonly url: string;

  /**
   * Constructs a new instance of the LunaService.
   * The API route can be provided as a parameter, but defaults to the API_ROUTE constant.
   *
   * @param url The base URL for the Luna API endpoint.
   */
  constructor(url: string = API_ROUTE) {
    this.cache = new ExpiringCache<LunaGame[]>();
    this.url = url;
  }

  /**
   * Performs a search for games on the Luna platform using the provided query.
   * The method creates a Search instance, sends the request to the Luna API,
   * and processes the response to extract the game data.
   *
   * @param query The search query to use.
   * @returns An array of LunaGame instances matching the search query.
   */
  public async search(query: string): Promise<LunaGame[]> {
    const cachedGames = this.cache.get(query);
    if (cachedGames) {
      return cachedGames;
    }

    const request = new Search(query);

    const response = await axios.post<Response>(this.url, request.body, { headers: request.headers });

    if (!response?.data || isEmpty(response.data)) {
      this.cache.set(query, []);
      return [];
    }

    const results = response.data.pageMemberGroups.mainContent.widgets
      .flatMap((widget) => widget.widgets)
      .map((widget) => new LunaGame(widget));

    this.cache.set(query, results);
    return results;
  }
}

/**
 * Re-exports the LunaGame class from the GameModel file,
 * making it accessible from the LunaService module.
 */
export { LunaGame } from "./GameModel";
