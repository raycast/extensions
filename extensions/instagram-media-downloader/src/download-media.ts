import axios from "axios";
import { Clipboard, Keyboard, open, showHUD, showInFinder, showToast, Toast } from "@raycast/api";
import { logger } from "@chrismessina/raycast-logger";
import { existsSync } from "node:fs";
import { rename } from "node:fs/promises";
import { resolve } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  assertMediaResponse,
  extensionFor,
  redactUrl,
  releaseReservation,
  countOf,
  reservePath,
  uniqueMediaUrls,
} from "./media-files";

export { mediaExtensionAndId } from "./media-files";

interface AbDownloaderInstagramMedia {
  status?: boolean;
  msg?: string;
  message?: string;
  thumbnail?: string;
  url?: string;
  resolution?: string;
  shouldRender?: boolean;
}

interface InstagramHighlightStory {
  img: string;
  url: string;
}

interface FollowmeterHighlightMedia {
  url?: string;
  type?: string;
  thumbnail?: string;
  poster?: string | null;
}

interface FollowmeterHighlightResponse {
  status?: string;
  media?: FollowmeterHighlightMedia[];
  message?: string;
  error?: string;
}

const AB_DOWNLOADER_INSTAGRAM_URL = "https://backend1.tioo.eu.org/igdl";
const AB_DOWNLOADER_USER_AGENT = "btch/1.0.2";
const FOLLOWMETER_HIGHLIGHT_DOWNLOADER_URL = "https://followmeter.app/highlight-downloader";
const FOLLOWMETER_STORY_DOWNLOADER_URL = "https://followmeter.app/story-downloader";
const FOLLOWMETER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36";

// Toast `onAction` handlers must `await` their side effects, otherwise the
// runtime tears the no-view command down before the call reaches the OS.
export async function showErrorToast(title: string, message: string, openUrl?: string) {
  const copyAction: Toast.ActionOptions = {
    title: "Copy Error",
    onAction: async () => {
      await Clipboard.copy(`${title}: ${message}`);
      await showHUD("Copied error to clipboard");
    },
  };

  const openAction: Toast.ActionOptions | undefined = openUrl
    ? {
        title: "Open in Browser",
        onAction: async () => {
          await open(openUrl);
        },
      }
    : undefined;

  await showToast({
    style: Toast.Style.Failure,
    title,
    message,
    primaryAction: openAction ?? copyAction,
    secondaryAction: openAction ? copyAction : undefined,
  });
}

async function fetchInstagramMediaWithAbDownloader(sourceUrl: string): Promise<string[]> {
  const response = await axios.get<AbDownloaderInstagramMedia[] | AbDownloaderInstagramMedia>(
    AB_DOWNLOADER_INSTAGRAM_URL,
    {
      params: { url: sourceUrl },
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": AB_DOWNLOADER_USER_AGENT,
      },
    },
  );

  const data = response.data;
  if (!Array.isArray(data)) {
    throw new Error(data.msg || data.message || "Unexpected response from ab-downloader.");
  }

  const mediaUrls = data
    .filter((item) => item.status !== false && typeof item.url === "string" && item.url.length > 0)
    .map((item) => item.url as string);

  if (mediaUrls.length === 0) {
    const errorItem = data.find((item) => item.msg || item.message);
    throw new Error(errorItem?.msg || errorItem?.message || "No media found from ab-downloader.");
  }

  return uniqueMediaUrls(mediaUrls);
}

type InstagramMediaType = "post" | "reel";

export async function getInstagramMediaURL(
  shortcode: string,
  progressToast?: Toast,
  sourceUrl?: string,
  mediaType: InstagramMediaType = "post",
) {
  try {
    if (progressToast) {
      progressToast.message = "Fetching via downloader API...";
    }
    const fallbackPath = mediaType === "reel" ? "reel" : "p";
    return await fetchInstagramMediaWithAbDownloader(
      sourceUrl || `https://www.instagram.com/${fallbackPath}/${shortcode}/`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await showErrorToast("Could not fetch Instagram media", message, sourceUrl);
    return null;
  }
}

async function fetchFollowmeterMedia(
  url: string,
  endpoint: string,
  fieldName: "input" | "url",
): Promise<FollowmeterHighlightMedia[]> {
  const response = await axios.post<FollowmeterHighlightResponse>(
    endpoint,
    { [fieldName]: url },
    {
      headers: {
        "Content-Type": "multipart/form-data",
        Origin: "https://followmeter.app",
        Referer: "https://followmeter.app/",
        "User-Agent": FOLLOWMETER_USER_AGENT,
      },
    },
  );

  if (response.data.status !== "success" || !Array.isArray(response.data.media)) {
    throw new Error(response.data.message || response.data.error || "Unexpected response from Followmeter.");
  }

  return response.data.media.filter((media) => typeof media.url === "string" && media.url.length > 0);
}

export async function getInstagramStoryURL(url: string): Promise<string[] | null> {
  try {
    const media = await fetchFollowmeterMedia(url, FOLLOWMETER_STORY_DOWNLOADER_URL, "url");
    return media.map((item) => item.url as string);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await showErrorToast("Could not fetch Instagram story", message);
    return null;
  }
}

export async function getInstagramHighlightStoryURL(url: string): Promise<InstagramHighlightStory[] | null> {
  try {
    const media = await fetchFollowmeterMedia(url, FOLLOWMETER_HIGHLIGHT_DOWNLOADER_URL, "input");
    return media.map((item) => ({
      img: item.thumbnail || item.poster || (item.url as string),
      url: item.url as string,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await showErrorToast("Could not fetch Instagram highlight story", message);
    return null;
  }
}

/**
 * A whole download, headers to last byte. Instagram media is tens of megabytes at most, so this
 * only trips on a stalled connection — without it a hung socket leaves the toast spinning.
 */
const DOWNLOAD_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Every Toast property assignment is an unawaited IPC round trip, replayed in order. A small
 * file arrives faster than ~100 percentage updates can drain, so throttle them, and drain the
 * queue (see `settle`) before returning — otherwise the toast freezes on a stale percentage.
 */
const PROGRESS_INTERVAL_MS = 250;

/** Wait until every queued update on `toast` has reached Raycast. */
async function settle(toast: Toast): Promise<void> {
  await toast.show().catch(() => {});
}

/**
 * A no-view command can be launched again while the first run is still going, and someone who
 * can't see that a carousel is still downloading will do exactly that — which is how the same
 * images ended up on disk twice, as `name(1).jpg`.
 */
let downloadActive = false;

/**
 * Run `work` under the download lock, or explain why not. Every download entry point goes
 * through this: the highlight view stays open, so pressing Download twice would otherwise start
 * a second batch alongside the first.
 */
export async function runExclusive(work: () => Promise<unknown>): Promise<void> {
  if (downloadActive) {
    logger.log(`[download-media] Blocked — a download is already running`);
    await showErrorToast("Download Already Running", "Wait for the current download to finish.");
    return;
  }
  downloadActive = true;
  try {
    await work();
  } finally {
    downloadActive = false;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function failInPlace(toast: Toast, title: string, message: string, copyContext: string) {
  toast.style = Toast.Style.Failure;
  toast.title = title;
  toast.message = message;
  toast.primaryAction = {
    title: "Copy Error",
    shortcut: Keyboard.Shortcut.Common.Copy,
    onAction: async () => {
      await Clipboard.copy(`${title}: ${message}\n${copyContext}`);
      await showHUD("Copied error to clipboard");
    },
  };
  toast.secondaryAction = undefined;
}

function revealActions(filePath: string): Pick<Toast, "primaryAction" | "secondaryAction"> {
  return {
    primaryAction: {
      // A toast can't use <Action.ShowInFinder>, which would supply the per-platform title.
      title: process.platform === "win32" ? "Show in File Explorer" : "Show in Finder",
      shortcut: Keyboard.Shortcut.Common.Open,
      onAction: async (toast) => {
        try {
          await showInFinder(filePath);
        } catch {
          toast.message = "Couldn't reveal the file — it may have moved.";
        }
      },
    },
    secondaryAction: {
      title: "Copy Path",
      shortcut: Keyboard.Shortcut.Common.CopyPath,
      onAction: async (toast) => {
        try {
          await Clipboard.copy(filePath);
          toast.message = "Path copied to clipboard";
        } catch {
          toast.message = "Couldn't copy the path.";
        }
      },
    },
  };
}

/**
 * Download one item into `downloadFolder` as `<name>.<ext>`, reporting progress on its own
 * toast titled with `label` ("Media 2 of 4"). Returns the saved path, or null after showing
 * why it failed — so a carousel carries on past one bad item.
 */
export async function handleDownload(
  mediaUrl: string,
  name: string,
  downloadFolder: string,
  label: string,
): Promise<string | null> {
  const progressToast = await showToast({
    title: `Downloading ${label}`,
    message: "0%",
    style: Toast.Style.Animated,
  });
  let pending: { filePath: string; partPath: string } | undefined;

  try {
    logger.log(`[download-media] Downloading ${label}`, { url: redactUrl(mediaUrl), name });

    const response = await fetch(mediaUrl, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
    logger.log(`[download-media] Media server responded`, {
      status: response.status,
      contentType: response.headers.get("content-type"),
      contentLength: response.headers.get("content-length"),
    });

    if (!response.ok || !response.body) {
      await response.body?.cancel().catch(() => {});
      throw new Error(`The media server returned ${response.status} ${response.statusText}.`);
    }

    // None of this consumes the body, so release the socket if it throws rather than leaving
    // it to the timeout — a carousel would otherwise strand one per failed item.
    const contentType = response.headers.get("content-type");
    let reserved;
    try {
      assertMediaResponse(contentType);
      reserved = await reservePath(resolve(downloadFolder), name, extensionFor(contentType, mediaUrl));
    } catch (error) {
      await response.body.cancel().catch(() => {});
      throw error;
    }
    const { handle, filePath } = reserved;
    pending = { filePath, partPath: reserved.partPath };

    const declared = Number(response.headers.get("content-length"));
    const total = Number.isFinite(declared) && declared > 0 ? declared : 0;
    let loaded = 0;
    let lastShown = "";
    let lastShownAt = -Infinity;

    const trackProgress = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        loaded += chunk.length;
        // Without a content-length there is no percentage, but silence reads as a stall.
        const next = total > 0 ? `${Math.min(100, Math.floor((loaded / total) * 100))}%` : formatBytes(loaded);
        const now = performance.now();
        if (next !== lastShown && now - lastShownAt >= PROGRESS_INTERVAL_MS) {
          lastShown = next;
          lastShownAt = now;
          progressToast.message = next;
        }
        callback(null, chunk);
      },
    });

    // `handle.createWriteStream()`, not `createWriteStream("", { fd })`, so only one owner closes the fd.
    await pipeline(Readable.fromWeb(response.body), trackProgress, handle.createWriteStream());

    if (loaded === 0) {
      throw new Error("The media server sent an empty response.");
    }

    // Only now does the file get its real name, so a half-written download is never mistaken
    // for a complete one.
    await rename(reserved.partPath, filePath);
    pending = undefined;

    if (!existsSync(filePath)) {
      throw new Error("The download finished but the file isn't on disk.");
    }

    progressToast.style = Toast.Style.Success;
    progressToast.title = `Downloaded ${label}`;
    progressToast.message = filePath;
    Object.assign(progressToast, revealActions(filePath));

    await settle(progressToast);
    logger.log(`[download-media] Download complete`, { filePath, bytes: loaded });
    return filePath;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[download-media] Download failed for ${label}`, { url: redactUrl(mediaUrl), error: message });

    if (pending) await releaseReservation(pending.filePath, pending.partPath);

    failInPlace(progressToast, `Couldn't Download ${label}`, message, `GET ${redactUrl(mediaUrl)}`);
    await settle(progressToast);
    return null;
  }
}

/**
 * Download a set of items one after another. Each item gets its own "<noun> 2 of 4" toast; a
 * multi-item run then ends on a summary, so the last toast on screen accounts for the whole set
 * rather than only the final file.
 */
export async function downloadMediaSet(
  items: { url: string; name: string }[],
  downloadFolder: string,
  noun: string,
): Promise<void> {
  const single = items.length === 1;
  const saved: string[] = [];

  logger.log(`[download-media] Starting a set of ${countOf(items.length, "item")}`, {
    names: items.map((item) => item.name),
  });

  for (const [index, item] of items.entries()) {
    const label = single ? noun : `${noun} ${index + 1} of ${items.length}`;
    const filePath = await handleDownload(item.url, item.name, downloadFolder, label);
    if (filePath) saved.push(filePath);
  }

  // handleDownload already reported a single item.
  if (single) return;

  const summary = `Saved ${saved.length} of ${countOf(items.length, "file")} to ${downloadFolder}`;
  if (saved.length === items.length) {
    await showToast({
      title: "Download Complete",
      message: summary,
      style: Toast.Style.Success,
      ...revealActions(saved[0]),
    });
  } else {
    const toast = await showToast({ title: "Download Partly Failed", style: Toast.Style.Failure });
    failInPlace(toast, "Download Partly Failed", summary, items.map((item) => redactUrl(item.url)).join("\n"));
    await settle(toast);
  }
}
