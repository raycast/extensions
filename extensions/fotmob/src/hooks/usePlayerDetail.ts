import { useCachedPromise } from "@raycast/utils";
import type { PlayerDetailData } from "@/types/player-detail";
import { buildPlayerImageUrl } from "@/utils/url-builder";

// Helper function to get common player names for known IDs
// This helps with players that might not be indexed properly by ID
async function getCommonPlayerNamesForId(playerId: string): Promise<string[]> {
  // Map of known problematic player IDs to their names
  const knownPlayers: Record<string, string[]> = {
    "1113903": ["Player Name"],
  };

  // Return known names for this ID, or try some generic approaches
  const knownNames = knownPlayers[playerId] || [];

  // Could also try to fetch from other sources or use AI to guess
  // For now, return the known mappings
  return knownNames;
}

export function usePlayerDetail(playerId: string) {
  const { data, error, isLoading, revalidate } = useCachedPromise(
    async (playerId: string): Promise<PlayerDetailData> => {
      // Strategy 1: Try searching by ID first
      let searchUrl = `https://apigw.fotmob.com/searchapi/suggest?term=${playerId}&lang=en`;

      try {
        let searchResponse = await fetch(searchUrl);
        if (!searchResponse.ok) {
          throw new Error(`Search API failed: ${searchResponse.status}`);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let searchResults = (await searchResponse.json()) as any; // Complex nested structure requires type assertion
        let playerOptions = searchResults.squadMemberSuggest?.[0]?.options || [];

        // Try to find the player by ID in search results
        let playerResult = playerOptions.find((option: { payload: { id: string } }) => option.payload.id === playerId);

        if (!playerResult && searchResults.total === 0) {
          // Strategy 2: If not found by ID, try some common player names for this ID
          // This is a fallback for known players that might not be indexed by ID
          const commonPlayerNames = await getCommonPlayerNamesForId(playerId);

          for (const playerName of commonPlayerNames) {
            try {
              searchUrl = `https://apigw.fotmob.com/searchapi/suggest?term=${encodeURIComponent(playerName)}&lang=en`;
              searchResponse = await fetch(searchUrl);

              if (searchResponse.ok) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                searchResults = (await searchResponse.json()) as any;
                playerOptions = searchResults.squadMemberSuggest?.[0]?.options || [];

                playerResult = playerOptions.find(
                  (option: { payload: { id: string } }) => option.payload.id === playerId,
                );

                if (playerResult) {
                  break; // Found the player!
                }
              }
            } catch {
              // Ignore search errors, try next name
            }
          }
        }

        if (!playerResult) {
          // Strategy 3: If still not found, try to fetch from a broader search
          // Sometimes players are not indexed properly but exist on the website
          // Try to get player data directly from the fotmob website endpoint
          try {
            const playerUrl = `https://www.fotmob.com/players/${playerId}`;
            // We can't parse the HTML here, but we can at least verify if the page exists
            const pageResponse = await fetch(playerUrl, { method: "HEAD" });

            if (pageResponse.ok) {
              // Player exists on the website, create a minimal data structure
              const playerData: PlayerDetailData = {
                id: Number(playerId),
                name: `Player ${playerId}`,
                firstName: "",
                lastName: "",
                shortName: "",
                imageUrl: buildPlayerImageUrl(playerId),
                birthdate: undefined,
                meta: {
                  personId: Number(playerId),
                  position: "Unknown",
                  positionDescription: "",
                  foot: "",
                  height: 0,
                  weight: 0,
                  country: undefined,
                  nationalTeam: undefined,
                },
                primaryTeam: undefined,
                careerHistory: {
                  careerItems: [],
                  careerTitles: [],
                },
                statSeasons: [],
                recentMatches: [],
                nextMatch: undefined,
                trophies: [],
                news: [],
                marketValue: [],
                transferHistory: [],
              };

              return playerData;
            }
          } catch {
            // Ignore errors from HEAD request, continue to error handling
          }
        }

        if (!playerResult) {
          // Check if we still haven't found the player
          throw new Error(
            `Player with ID ${playerId} not found. Try using the "Search Players" command to find the player by name, which is more reliable than searching by ID.`,
          );
        }

        if (playerResult) {
          // Create a simplified player data object from search results
          const playerName = playerResult.text.split("|")[0];
          const playerData: PlayerDetailData = {
            id: Number(playerId),
            name: playerName,
            firstName: "",
            lastName: "",
            shortName: "",
            imageUrl: buildPlayerImageUrl(playerId),
            birthdate: undefined,
            meta: {
              personId: Number(playerId),
              position: playerResult.payload.isCoach ? "Coach" : "Player",
              positionDescription: "",
              foot: "",
              height: 0,
              weight: 0,
              country: undefined,
              nationalTeam: undefined,
            },
            primaryTeam: playerResult.payload.teamId
              ? {
                  id: playerResult.payload.teamId,
                  name: playerResult.payload.teamName || "",
                  shortName: "",
                  teamColorPrimary: "",
                  teamColorSecondary: "",
                  teamColorText: "",
                }
              : undefined,
            careerHistory: {
              careerItems: [],
              careerTitles: [],
            },
            statSeasons: [],
            recentMatches: [],
            nextMatch: undefined,
            trophies: [],
            news: [],
            marketValue: [],
            transferHistory: [],
          };

          return playerData;
        }

        // If player ID exists in database but not found in search results,
        // it could be due to search indexing issues
        throw new Error(
          `Player with ID ${playerId} exists but could not be retrieved from search results. Try using the "Search Players" command to find the player by name instead.`,
        );
      } catch (error) {
        // Don't log to console as it clutters the output, just throw a user-friendly error
        if (error instanceof Error) {
          throw error;
        }
        throw new Error(`Unable to fetch player data: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    },
    [playerId],
    {
      execute: !!playerId && !Number.isNaN(Number(playerId)),
      keepPreviousData: true,
    },
  );

  // Provide default data structure if no data is available
  const defaultData: PlayerDetailData = {
    id: Number(playerId) || 0,
    name: "Unknown Player",
    firstName: "",
    lastName: "",
    shortName: "",
    imageUrl: buildPlayerImageUrl(playerId),
    birthdate: undefined,
    meta: {
      personId: Number(playerId) || 0,
      position: "Unknown",
      positionDescription: "",
      foot: "",
      height: 0,
      weight: 0,
      country: undefined,
      nationalTeam: undefined,
    },
    primaryTeam: undefined,
    careerHistory: {
      careerItems: [],
      careerTitles: [],
    },
    statSeasons: [],
    recentMatches: [],
    nextMatch: undefined,
    trophies: [],
    news: [],
    marketValue: [],
    transferHistory: [],
  };

  return {
    playerDetail: data ?? defaultData,
    error,
    isLoading,
    revalidate,
  };
}
