import { BrowserExtension, environment } from "@raycast/api";
import { extractPostMedia, ExtractMissReason, PostMedia } from "./instagram-post";
import { extractReelMedia, ReelItem } from "./instagram-reel";
import { InstagramPostRef, InstagramStoryRef, parseInstagramPostUrl, parseInstagramStoryUrl } from "./instagram-url";

/**
 * Why the browser could not supply the page. A miss sends a post to Instagram itself instead; for
 * a story or highlight it is reported, since only the browser has those.
 */
export type BrowserMissReason = "unavailable" | "no-tab" | "timeout" | "error" | ExtractMissReason;
export type BrowserMiss = { ok: false; reason: BrowserMissReason; detail?: string };
export type BrowserResult = { ok: true; media: PostMedia[] } | BrowserMiss;
export type BrowserReelResult = { ok: true; items: ReelItem[] } | BrowserMiss;

const TABS_TIMEOUT_MS = 2000;
/** A post page is ~2 MB of HTML, which measured 40–70 ms; this is for a host that hangs. */
const CONTENT_TIMEOUT_MS = 4000;

const TIMED_OUT = Symbol("timed out");

/**
 * Wait at most `ms` for `operation`. A synchronous throw becomes a rejection rather than escaping
 * before the timer exists. A call that rejects after the deadline is still handled: `race`
 * subscribed to it. This bounds the wait only: the API has no way to cancel the call.
 */
async function bounded<T>(operation: () => Promise<T>, ms: number): Promise<T | typeof TIMED_OUT> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<typeof TIMED_OUT>((resolve) => {
    timer = setTimeout(() => resolve(TIMED_OUT), ms);
  });
  try {
    return await Promise.race([Promise.resolve().then(operation), deadline]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Whether the Raycast browser extension can be used at all. It does not exist on Windows, and
 * `canAccess` answers without IPC.
 */
export function browserExtensionAvailable(): boolean {
  try {
    return process.platform !== "win32" && environment.canAccess(BrowserExtension);
  } catch {
    return false;
  }
}

/**
 * Read from a browser tab showing exactly the requested page — never any other tab, since a page
 * carries the rest of the signed-in feed. The HTML is parsed in memory and never logged or stored.
 */
async function readFromBrowser<Found extends { ok: true }>(
  isTarget: (tabUrl: string) => boolean,
  extract: (html: string) => Found | { ok: false; reason: ExtractMissReason },
): Promise<Found | BrowserMiss> {
  try {
    if (!browserExtensionAvailable()) return { ok: false, reason: "unavailable" };

    const tabs = await bounded(() => BrowserExtension.getTabs(), TABS_TIMEOUT_MS);
    if (tabs === TIMED_OUT) return { ok: false, reason: "timeout" };

    // Active tabs first. `active` is per window, so an old, half-loaded copy of the page can be
    // active in one window while a fresh copy (say, one ⌘T just opened) sits in another: read
    // each until one holds the whole thing, and report the preferred tab's miss otherwise.
    const matching = tabs.filter((tab) => isTarget(tab.url ?? "")).sort((a, b) => Number(b.active) - Number(a.active));
    if (matching.length === 0) return { ok: false, reason: "no-tab" };

    let firstMiss: BrowserMiss | undefined;
    for (const tab of matching) {
      const html = await bounded(
        () => BrowserExtension.getContent({ format: "html", tabId: tab.id }),
        CONTENT_TIMEOUT_MS,
      );
      // If the tab moved to another page between listing and reading, the page no longer holds
      // this one in full, and this is a miss rather than the wrong media.
      const result = html === TIMED_OUT ? ({ ok: false, reason: "timeout" } as const) : extract(html);
      if (result.ok) return result;
      firstMiss ??= result;
    }
    return firstMiss as BrowserMiss;
  } catch (error) {
    return { ok: false, reason: "error", detail: error instanceof Error ? error.message : String(error) };
  }
}

/** A post's media, from a tab showing that post. */
export function readPostFromBrowser(ref: InstagramPostRef): Promise<BrowserResult> {
  return readFromBrowser(
    (tabUrl) => parseInstagramPostUrl(tabUrl)?.shortcode === ref.shortcode,
    (html) => extractPostMedia(html, ref.shortcode),
  );
}

/**
 * A story's or a highlight's media, from a tab showing it. A story tab moves on to the user's
 * next story as it plays, so any tab on that user's stories is read; the page decides whether
 * the requested story is in it.
 */
export function readReelFromBrowser(ref: InstagramStoryRef): Promise<BrowserReelResult> {
  return readFromBrowser(
    (tabUrl) => {
      const tab = parseInstagramStoryUrl(tabUrl);
      if (!tab || tab.kind !== ref.kind) return false;
      if (tab.kind === "highlight" && ref.kind === "highlight") return tab.highlightId === ref.highlightId;
      return tab.kind === "story" && ref.kind === "story" && tab.user.toLowerCase() === ref.user.toLowerCase();
    },
    (html) => extractReelMedia(html, ref),
  );
}
