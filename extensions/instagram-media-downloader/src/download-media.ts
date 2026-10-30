import {
  Clipboard,
  Keyboard,
  launchCommand,
  LaunchType,
  open,
  showHUD,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import { logger } from "@chrismessina/raycast-logger";
import { existsSync } from "node:fs";
import { rename } from "node:fs/promises";
import { resolve } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  assertMediaResponse,
  countOf,
  extensionFor,
  mediaBasename,
  redactUrl,
  releaseReservation,
  reservePath,
} from "./media-files";

import { BrowserMiss, browserExtensionAvailable, readPostFromBrowser, readReelFromBrowser } from "./browser-tab";
import {
  describeRequest,
  fetchPostFromInstagram,
  INSTAGRAM_TIMEOUT_SECONDS,
  InstagramReplyError,
  stripUrlSecrets,
} from "./instagram-direct";
import {
  canonicalPostUrl,
  canonicalStoryUrl,
  commandForInstagramUrl,
  DownloadCommand,
  InstagramPostRef,
  InstagramStoryRef,
} from "./instagram-url";

/**
 * Hand a link to the command that downloads it, so a story or highlight link pasted into
 * another command still works. Returns false when no command takes the link.
 */
export async function handOff(link: string, from: DownloadCommand): Promise<boolean> {
  const command = commandForInstagramUrl(link);
  if (!command || command === from) return false;
  logger.log(`[download-media] Handing the link to ${command}`);
  try {
    await launchCommand({ name: command, type: LaunchType.UserInitiated, arguments: { instagramUrl: link } });
  } catch (error) {
    // Raycast refuses to launch a command the user has turned off.
    const message = error instanceof Error ? error.message : "Unknown error";
    await showErrorToast("Couldn't Open the Right Command", message);
  }
  return true;
}

export const NOT_INSTAGRAM_TITLE = "Not an Instagram Link";
export const NOT_INSTAGRAM_MESSAGE = "Paste a post, reel, story or highlight link.";

/** Opening a page in a new tab, everywhere this extension offers it. */
export const OPEN_TAB_SHORTCUT: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd"], key: "t" },
  Windows: { modifiers: ["ctrl"], key: "t" },
};

/** The Raycast browser extension's install page, offered wherever a command needs it. */
export const BROWSER_EXTENSION_URL = "https://www.raycast.com/browser-extension";

/** A link the failure toast opens: a page to open in the browser, or one with its own title. */
type ToastLink = string | { title: string; url: string };

// Toast `onAction` handlers must `await` their side effects, otherwise the
// runtime tears the no-view command down before the call reaches the OS.
export async function showErrorToast(title: string, rawMessage: string, link?: ToastLink, details?: string) {
  // Every command's errors pass through here, including replies from services that echo URLs
  // back. `details` is built here in code, which redacts the reply it quotes (`describeInstagramReply`)
  // and keeps the request's own query on purpose.
  const message = stripUrlSecrets(rawMessage);
  logger.error(`[toast] ${title}`, details ? { message, details } : { message });
  const copyAction: Toast.ActionOptions = {
    title: "Copy Error",
    onAction: async () => {
      await Clipboard.copy(details ? `${title}: ${message}\n${details}` : `${title}: ${message}`);
      await showHUD("Copied error to clipboard");
    },
  };

  const target = typeof link === "string" ? { title: "Open in Browser", url: link } : link;
  const openAction: Toast.ActionOptions | undefined = target
    ? {
        title: target.title,
        shortcut: OPEN_TAB_SHORTCUT,
        onAction: async () => {
          await open(target.url);
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

/** Where to look first for a post; the other is the fallback. Stories always come from the browser. */
export type DownloadMethod = "browser" | "instagram";

/** What one pipeline downloads: a post or reel, or a story. Highlights have their own grid. */
export type MediaTarget = InstagramPostRef | Extract<InstagramStoryRef, { kind: "story" }>;
export type DownloadItem = { url: string; name: string };

type MediaLookup = {
  progressToast?: Toast;
  method: DownloadMethod;
};

/** After ⌘T opens the page, how often and how long to look for it in the browser. */
const TAB_WATCH_INTERVAL_MS = 1500;
const TAB_WATCH_LIMIT_MS = 30_000;
/** How long a story waits for ⌘T when no tab has it: there is nowhere else to ask. */
const OPEN_WAIT_MS = 30_000;

/** A failed fetch the user can read; the raw error goes to Copy Error. */
type FetchFailure = { message: string; details: string };

/** A post's files, named `<shortcode>` or, for a carousel, `<shortcode>-1`, `-2`, … */
function postItems(shortcode: string, urls: string[]): DownloadItem[] {
  return urls.map((url, index) => ({ url, name: mediaBasename(shortcode, index, urls.length) }));
}

function isPost(target: MediaTarget): target is InstagramPostRef {
  return target.kind !== "story";
}

/** The target's files, read from a browser tab showing it. */
async function readTargetFromBrowser(target: MediaTarget): Promise<{ ok: true; items: DownloadItem[] } | BrowserMiss> {
  if (isPost(target)) {
    const result = await readPostFromBrowser(target);
    if (!result.ok) return result;
    logTab(result.media.map((item) => item.kind));
    return {
      ok: true,
      items: postItems(
        target.shortcode,
        result.media.map((item) => item.url),
      ),
    };
  }
  const result = await readReelFromBrowser(target);
  if (!result.ok) return result;
  // A link without a story id means the user's first story.
  const [story] = result.items;
  logTab([story.kind]);
  return { ok: true, items: [{ url: story.url, name: `story-${story.id}` }] };
}

/**
 * The files for a post, reel or story — one pipeline for every command. A browser tab showing the
 * target is read through the Raycast browser extension; for posts, Instagram itself is the other
 * source, and `method` picks which goes first. Stories exist only in a signed-in page, so for them
 * the browser is the only source. While waiting, ⌘T on the progress toast opens the target in a
 * new tab, and the download comes from that tab if it gets the whole page first.
 */
export async function resolveMedia(target: MediaTarget, lookup: MediaLookup): Promise<DownloadItem[] | null> {
  const { progressToast, method } = lookup;
  const post = isPost(target);
  const noun = post ? "post" : "story";
  const link = post ? canonicalPostUrl(target) : canonicalStoryUrl(target);
  // Without the browser extension, opening a tab changes nothing.
  let tabCanHelp = browserExtensionAvailable();
  let browserMiss = tabCanHelp ? "not tried" : "unavailable";

  const readTab = async (): Promise<DownloadItem[] | null> => {
    if (progressToast) progressToast.message = "Reading from your browser...";
    const browser = await readTargetFromBrowser(target);
    if (browser.ok) return browser.items;
    // A host error can quote a signed link.
    browserMiss = browser.detail ? `${browser.reason} (${stripUrlSecrets(browser.detail)})` : browser.reason;
    if (browser.reason === "unavailable") tabCanHelp = false;
    logger.log(`[download-media] Browser tab can't supply the ${noun}`, { reason: browserMiss });
    return null;
  };

  if (tabCanHelp && (method === "browser" || !post)) {
    const fromBrowser = await readTab();
    if (fromBrowser) return fromBrowser;
  }

  if (!post && !tabCanHelp) {
    await showErrorToast(
      "Could Not Read the Story",
      "Downloading stories needs the Raycast browser extension.",
      { title: "Install Browser Extension", url: BROWSER_EXTENSION_URL },
      `Browser tab: ${browserMiss}`,
    );
    return null;
  }

  const request = new AbortController();
  const state = { watching: false, settled: false };
  /** Set on the first ⌘T, so a tab may have the page even after its watch ran out. */
  let tabWatch: Promise<DownloadItem[] | null> | undefined;
  let opened: () => void = () => {};
  const openPressed = new Promise<void>((resolve) => (opened = resolve));
  let openWait: ReturnType<typeof setTimeout> | undefined;
  /**
   * Every watch ⌘T started, newest last. A press while the last check is running starts a fresh
   * watch, so the outcome waits for each one rather than only the first.
   */
  let settledWatch: Promise<DownloadItem[] | null> | undefined;
  const awaitWatches = async (): Promise<DownloadItem[] | null> => {
    while (tabWatch && tabWatch !== settledWatch) {
      settledWatch = tabWatch;
      const found = await settledWatch;
      if (found) return found;
    }
    return null;
  };

  if (progressToast && tabCanHelp) {
    progressToast.primaryAction = {
      title: "Open in Browser",
      shortcut: OPEN_TAB_SHORTCUT,
      onAction: async () => {
        await open(link);
        opened();
        // One watch at a time; pressing again after one ran out starts a fresh one.
        if (state.watching) return;
        state.watching = true;
        progressToast.message = `Waiting for the ${noun} to load in your browser...`;
        logger.log(`[download-media] Opened the ${noun} in a new tab; watching for it`);
        // A tab that answers first cancels the request to Instagram, which then returns at once.
        tabWatch = watchBrowser(
          () => readTargetFromBrowser(target),
          () => state.settled,
        ).then((found) => {
          state.watching = false;
          if (!found) return null;
          request.abort();
          return found.items;
        });
      },
    };
  }

  try {
    let first: DownloadItem[] | FetchFailure;
    if (post) {
      const fetched = await fetchWithRetries(target, progressToast, request.signal, state);
      first = Array.isArray(fetched) ? postItems(target.shortcode, fetched) : fetched;
    } else {
      // Nowhere else to ask: give the user time to press ⌘T.
      if (progressToast) progressToast.message = "Not open in your browser. Press ⌘T to open it.";
      await Promise.race([openPressed, new Promise((resolve) => (openWait = setTimeout(resolve, OPEN_WAIT_MS)))]);
      first = { message: "The story isn't open in your browser.", details: `Waited for ⌘T, then for the tab.` };
    }
    if (Array.isArray(first)) return first;

    // The first source gave up or was canceled, and a tab opened with ⌘T may have it or still be loading.
    const fromWatch = await awaitWatches();
    if (fromWatch) return fromWatch;

    // The browser is the fallback with Instagram first, and after ⌘T a tab may have loaded since
    // its watch ran out.
    if (tabCanHelp && (method === "instagram" || tabWatch)) {
      const fromBrowser = await readTab();
      if (fromBrowser) return fromBrowser;
      // ⌘T may have started another watch while that check ran.
      const fromLaterWatch = await awaitWatches();
      if (fromLaterWatch) return fromLaterWatch;
    }

    const hint = `Open the ${noun} in a new browser tab, then try again.`;
    const message = tabCanHelp ? (post ? `${hint} ${first.message}` : hint) : first.message;
    const details = `${first.details}\nBrowser tab: ${browserMiss}`;
    await showErrorToast(`Could not fetch Instagram ${post ? "media" : "story"}`, message, link, details);
    return null;
  } finally {
    state.settled = true;
    clearTimeout(openWait);
    if (progressToast) progressToast.primaryAction = undefined;
  }
}

function logTab(kinds: string[]) {
  logger.log(`[download-media] Resolved from the browser tab`, { items: kinds.length, kinds });
}

/**
 * Poll the browser until a tab the user just opened holds the whole page, or give up. Shared by
 * the post cascade and the highlight view.
 */
export async function watchBrowser<Result extends { ok: boolean }>(
  read: () => Promise<Result>,
  isSettled: () => boolean,
): Promise<Extract<Result, { ok: true }> | null> {
  // Measured by the clock, not by counting sleeps: a slow browser read takes seconds of its own.
  // A monotonic clock, so a system clock change can't end or stretch the watch.
  const deadline = performance.now() + TAB_WATCH_LIMIT_MS;
  while (performance.now() + TAB_WATCH_INTERVAL_MS < deadline) {
    await new Promise((resolve) => setTimeout(resolve, TAB_WATCH_INTERVAL_MS));
    if (isSettled()) return null;
    const result = await read();
    if (result.ok) return result as Extract<Result, { ok: true }>;
  }
  logger.log(`[download-media] The opened tab never held the whole page`);
  return null;
}

const INSTAGRAM_ATTEMPTS = 3;

/** What went wrong, in words; axios's own messages ("timeout of 15000ms exceeded") stay in details. */
function describeFetchError(error: unknown): string {
  if (error instanceof InstagramReplyError) return error.message;
  const code = (error as { code?: string } | null)?.code;
  if (code === "ECONNABORTED" || code === "ETIMEDOUT") {
    return `Instagram didn't answer within ${INSTAGRAM_TIMEOUT_SECONDS} seconds.`;
  }
  if (code === "ENOTFOUND" || code === "EAI_AGAIN" || code === "ECONNREFUSED" || code === "ECONNRESET") {
    return "Couldn't reach Instagram.";
  }
  return error instanceof Error ? error.message : "Unknown error";
}

async function fetchWithRetries(
  ref: InstagramPostRef,
  progressToast: Toast | undefined,
  signal: AbortSignal,
  state: { watching: boolean },
): Promise<string[] | FetchFailure> {
  const request = describeRequest(ref.shortcode);

  for (let attempt = 1; ; attempt++) {
    try {
      // Once ⌘T opened a tab, the toast is about that tab.
      if (progressToast && !state.watching) {
        progressToast.message =
          attempt === 1
            ? "Asking Instagram..."
            : `Instagram is busy, retrying (${attempt} of ${INSTAGRAM_ATTEMPTS})...`;
      }
      return await fetchPostFromInstagram(ref.shortcode, signal);
    } catch (error) {
      // A transport error can quote a URL; only Instagram's own replies were redacted already.
      const raw = stripUrlSecrets(error instanceof Error ? error.message : "Unknown error");
      const retryable = error instanceof InstagramReplyError && error.retryable;
      if (signal.aborted) return { message: "Canceled: the browser tab answered first.", details: request };
      logger.error(`[download-media] Instagram attempt ${attempt} failed`, { error: raw });

      if (retryable && attempt < INSTAGRAM_ATTEMPTS) {
        // Rate limits ease with time: wait 1 s, then 2 s.
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        continue;
      }

      const reply = error instanceof InstagramReplyError ? error.details : raw;
      return {
        message: describeFetchError(error),
        details: `${request}\n${reply} (after ${countOf(attempt, "attempt")})`,
      };
    }
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

export function revealActions(filePath: string): Pick<Toast, "primaryAction" | "secondaryAction"> {
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
