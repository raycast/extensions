import { showToast, Toast, closeMainWindow, PopToRootType } from "@raycast/api";
import { existsSync } from "fs";
import { getFavorites } from "./storage";
import { playSoundInBackground } from "../api/audio";

/**
 * Play the favorite at 1-based index (1 = first favorite) in the background.
 * Starts playback and returns immediately so the window can close; sound continues playing.
 * Never throws: handles no favorites, missing index, and playback errors.
 */
export async function playFavoriteByIndex(index: number): Promise<boolean> {
  try {
    const favorites = await getFavorites();
    const list = Array.isArray(favorites) ? favorites : [];
    const oneBased = Math.floor(Number(index));
    if (oneBased < 1 || oneBased > list.length) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Such Favorite",
        message:
          list.length === 0
            ? "You have no favorites yet. Add sounds from Search or Trending."
            : `Favorite ${oneBased} doesn't exist. You have ${list.length} favorite(s).`,
      });
      return false;
    }
    const sound = list[oneBased - 1];
    const playSource = sound.localPath && existsSync(sound.localPath) ? sound.localPath : sound.soundUrl;
    if (!playSource) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Favorite",
        message: "That favorite has no sound URL or local file.",
      });
      return false;
    }
    try {
      await playSoundInBackground(playSource);
      await showToast({
        style: Toast.Style.Success,
        title: "Playing in background",
        message: sound.name ?? "Favorite",
      });
      return true;
    } catch (playError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Playback Failed",
        message: playError instanceof Error ? playError.message : String(playError),
      });
      return false;
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Run from a no-view command: play favorite by index, then close the window.
 * Never throws: always closes the window.
 */
export async function runPlayFavoriteAndClose(index: number): Promise<void> {
  try {
    await playFavoriteByIndex(index);
  } catch {
    // already handled in playFavoriteByIndex
  } finally {
    try {
      await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
    } catch {
      // ignore close errors
    }
  }
}
