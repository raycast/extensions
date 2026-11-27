import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { logger } from "@chrismessina/raycast-logger";
import { homedir } from "os";
import {
  downloadMediaSet,
  handOff,
  MediaTarget,
  NOT_INSTAGRAM_MESSAGE,
  NOT_INSTAGRAM_TITLE,
  resolveMedia,
  runExclusive,
  showErrorToast,
} from "./download-media";
import { DownloadCommand, parseInstagramPostUrl, parseInstagramStoryUrl } from "./instagram-url";

/**
 * Download whatever a link points at — a post, reel or story — through the one pipeline every
 * command shares. A highlight link opens the highlight grid instead.
 */
export async function downloadFromLink(link: string, from: DownloadCommand): Promise<void> {
  const { mediaDownloadPath, downloadMethod } = getPreferenceValues<Preferences>();
  const downloadFolder = mediaDownloadPath || `${homedir()}/Downloads`;

  const story = parseInstagramStoryUrl(link);
  const target: MediaTarget | null = parseInstagramPostUrl(link) ?? (story?.kind === "story" ? story : null);
  if (!target) {
    if (!(await handOff(link, from))) await showErrorToast(NOT_INSTAGRAM_TITLE, NOT_INSTAGRAM_MESSAGE);
    return;
  }

  const label = target.kind === "story" ? "Story" : "Media";
  try {
    // A relaunch while a carousel is still downloading would write a second copy of every file.
    await runExclusive(async () => {
      const progressToast = await showToast({ title: `Fetching ${label}`, style: Toast.Style.Animated });
      const items = await resolveMedia(target, { progressToast, method: downloadMethod });
      // On null, resolveMedia already showed why.
      if (!items) return;
      logger.log(`[download-link] Resolved`, { kind: target.kind, items: items.length });
      await downloadMediaSet(items, downloadFolder, label);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    await showErrorToast("Error", message);
  }
}
