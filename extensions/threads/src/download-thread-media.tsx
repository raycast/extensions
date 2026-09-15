import { homedir } from "node:os";
import { LaunchProps, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { countOf, showError } from "@chrismessina/raycast-kit";
import { logger } from "@chrismessina/raycast-logger";
import { beginDownloadRun, endDownloadRun, handleDownload } from "./lib/download-media";
import { redactUrl } from "./lib/media-files";
import { resolveThreadsPost } from "./lib/threads-post";

export default async function Command({
  arguments: { threadsUrl },
}: LaunchProps<{ arguments: Arguments.DownloadThreadMedia }>) {
  const { mediaDownloadPath, imageFormat } = getPreferenceValues<Preferences.DownloadThreadMedia>();
  const downloadFolder = mediaDownloadPath || `${homedir()}/Downloads`;

  // Redacted: someone can paste a signed CDN URL here, whose oh/oe params are live credentials.
  logger.log(`[download-threads-media] Command started`, {
    threadsUrl: redactUrl(threadsUrl),
    downloadFolder,
    imageFormat,
  });

  if (!threadsUrl?.trim()) {
    await showError("Paste a Threads post link, e.g. threads.com/@username/post/ABC123", {
      title: "Missing URL",
    });
    return;
  }

  // A no-view command can be relaunched while the first run is still going, and someone
  // who thinks a long download has stalled will do exactly that.
  if (!beginDownloadRun()) {
    logger.log(`[download-threads-media] Blocked — a download is already running`);
    // Not animated: a spinner that nothing will ever resolve reads as a hang.
    await showError("Wait for the current download to finish.", { title: "Download Already Running" });
    return;
  }

  try {
    await runDownload(threadsUrl, downloadFolder, imageFormat);
  } finally {
    endDownloadRun();
  }
}

async function runDownload(threadsUrl: string, downloadFolder: string, imageFormat: string | undefined) {
  // Fire the indicator before the network call — resolving a post takes a moment and a
  // silent window reads as a stalled command.
  await showToast({ title: "Finding Media", style: Toast.Style.Animated });

  let post;
  try {
    post = await resolveThreadsPost(threadsUrl);
    // `resolveThreadsPost` is @raycast/api-free so it stays unit-testable; it reports what
    // happened through its return value, and through the error message on the way out.
    logger.log(`[download-threads-media] Resolved post`, {
      code: post.code,
      canonicalUrl: redactUrl(post.canonicalUrl),
      media: post.media.length,
      kinds: post.media.map((item) => item.kind),
    });
  } catch (error) {
    logger.error(`[download-threads-media] Couldn't resolve the post`, {
      threadsUrl: redactUrl(threadsUrl),
      error: error instanceof Error ? error.message : String(error),
    });
    await showError(error, {
      title: "Couldn't Read That Post",
      copyContext: redactUrl(threadsUrl),
      // The resolver's 30s timeout surfaces as a TimeoutError, which showError otherwise
      // swallows — leaving the "Finding Media" spinner up with no explanation.
      ignoreAbort: false,
    });
    return;
  }

  if (post.media.length === 0) {
    await showError("This post has no media to download.", {
      title: "No Media Found",
      copyContext: redactUrl(post.canonicalUrl),
    });
    return;
  }

  const single = post.media.length === 1;
  let saved = 0;

  for (const [index, media] of post.media.entries()) {
    const basename = single ? post.code : `${post.code}-${index + 1}`;
    const label = single ? "Media" : `Media ${index + 1} of ${post.media.length}`;

    // Per-item, so one failed item doesn't abandon the rest of a carousel.
    if (await handleDownload(media, basename, downloadFolder, label, { imageFormat })) saved++;
  }

  // handleDownload already reports each item; only summarise a multi-item run.
  if (!single) {
    const summary = `Saved ${countOf(saved, "file")} of ${post.media.length} to ${downloadFolder}`;
    if (saved === post.media.length) {
      await showToast({ title: "Download Complete", message: summary, style: Toast.Style.Success });
    } else {
      await showError(summary, { title: "Download Partly Failed", copyContext: redactUrl(post.canonicalUrl) });
    }
  }
}
