import { launchCommand, LaunchType } from "@raycast/api";

/**
 * Best-effort refresh of the "Now Playing" menu-bar command right after a
 * playback control fires, so the menu bar doesn't wait out its poll interval
 * to reflect the new state. Swallows errors: the menu-bar command may be
 * disabled by the user, in which case launchCommand rejects and there's
 * nothing useful to do about it here.
 */
export async function refreshMenuBar(): Promise<void> {
  try {
    await launchCommand({ name: "nowPlaying", type: LaunchType.Background });
  } catch {
    // best-effort only
  }
}
