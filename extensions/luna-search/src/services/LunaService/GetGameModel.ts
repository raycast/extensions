import { BASE_REQUEST, DEFAULT_HEADERS, DEFAULT_TIMEOUT_S } from "./constants";
import { Request } from "./RequestModel";
import { GameSummary } from "./GameSummary";

/**
 * Encapsulates the logic for creating a search request to the Luna API.
 * The request includes the search query, a timeout (defaulting to 3 seconds),
 * and sets the page type to the SEARCH_PAGE_TYPE constant.
 */
export class GetGame {
  readonly headers: Record<string, string>;
  readonly body: Request;

  constructor(readonly game: GameSummary, readonly timeout: number = DEFAULT_TIMEOUT_S) {
    this.headers = DEFAULT_HEADERS;

    const body: Request = {
      ...BASE_REQUEST,
      serviceToken: game.detailToken,
      timeout,
    };
    this.body = body;
  }
}
