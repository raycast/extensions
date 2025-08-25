export * from "./types";
export { getMusicState } from "./music";
export { getSpotifyState } from "./spotify";

import { getMusicState } from "./music";
import { getSpotifyState } from "./spotify";
import type { PlayerState } from "./types";

/**
 * Get the current state from all supported music players
 * Returns the state of the first active player found, or null if no player is active
 */
export async function getCurrentPlayerState(): Promise<PlayerState | null> {
  try {
    // Check Music.app first
    const musicState = await getMusicState();
    if (musicState.isPlaying) {
      return musicState;
    }

    // Then check Spotify
    const spotifyState = await getSpotifyState();
    if (spotifyState.isPlaying) {
      return spotifyState;
    }

    // Return Music.app state as default if no player is playing
    return musicState;
  } catch (error) {
    console.error("Error getting player state:", error);
    return null;
  }
}
