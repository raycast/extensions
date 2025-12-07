/**
 * Fetch D&D Beyond character data via CORS proxy
 *
 * This utility handles fetching character data from D&D Beyond's API
 * through a CORS proxy, since D&D Beyond doesn't allow direct requests
 * from non-browser environments.
 */

const DDB_BASE_URL =
  "https://character-service.dndbeyond.com/character/v5/character";
const PROXY_URL = "https://try.dicelab.dev/corsproxy/";

/**
 * Fetch a D&D Beyond character's JSON data by ID
 *
 * @param characterId - The D&D Beyond character ID (numeric string)
 * @returns Raw JSON string from D&D Beyond API
 * @throws Error if fetch fails or returns non-OK status
 */
export async function fetchDdbCharacter(characterId: string): Promise<string> {
  // Build the D&D Beyond API URL
  const apiUrl = `${DDB_BASE_URL}/${characterId}`;

  // Build the proxy URL with encoded API URL
  const proxyUrl = `${PROXY_URL}?apiurl=${encodeURIComponent(apiUrl)}`;

  try {
    const response = await fetch(proxyUrl);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch D&D Beyond character ${characterId}: HTTP ${response.status} ${response.statusText}`,
      );
    }

    const jsonText = await response.text();

    // Validate that we got JSON
    if (!jsonText || jsonText.trim().length === 0) {
      throw new Error("Received empty response from D&D Beyond");
    }

    return jsonText;
  } catch (error) {
    // Re-throw with more context if it's a network error
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error(
        `Network error: Unable to connect to D&D Beyond. Please check your internet connection.`,
      );
    }

    // Re-throw other errors as-is
    throw error;
  }
}
