import { Game, GameSummary, LunaResponse } from "../../models";

/**
 * Parses the game summaries from the provided Luna API response.
 *
 * @param containerId The ID of the container widget that holds the game summaries.
 * @param response The Luna API response object.
 * @returns An array of GameSummary instances, or an empty array if the response is invalid or there are no game summaries.
 */
export async function parseGameSummaries(containerId: string, response: Response): Promise<GameSummary[]> {
  // Check if the response is valid and has a successful status code
  if (!response || response.status !== 200) {
    return [];
  }

  // Parse the response JSON data as a LunaResponse
  const resultData = (await response.json()) as LunaResponse;
  if (!resultData) {
    return [];
  }

  // Filter the widgets to find the one with the specified containerId, then map them to GameSummary instances
  return resultData.pageMemberGroups.mainContent.widgets
    .filter((widget) => widget.id === containerId)
    .flatMap((widget) => widget.widgets)
    .map((widget) => {
      try {
        return new GameSummary(widget);
      } catch (e) {
        console.debug("Error converting to game summary", e);
      }
      return null;
    })
    .filter((game) => !!game) as GameSummary[];
}

/**
 * Parses the game details from the provided Luna API response.
 *
 * @param response The Luna API response object.
 * @returns A Game instance if the response is valid and contains game details, or undefined otherwise.
 */
export async function parseGame(response: Response): Promise<Game | undefined> {
  // Check if the response is valid and has a successful status code
  if (!response || response.status !== 200) {
    return undefined;
  }

  // Parse the response JSON data as a LunaResponse
  const resultData = (await response.json()) as LunaResponse;
  if (!resultData) {
    return undefined;
  }

  // Create a new Game instance from the response data
  return new Game(resultData);
}
