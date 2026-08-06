import { Action, ActionPanel, Image, List, LaunchType, launchCommand } from "@raycast/api";
import axios from "axios";
import { useEffect, useState } from "react";
import { Bookmark } from "./interfaces";
import { INVALID_FAVICONS } from "./constants";
import { authenticationCheck, cache, getCachedBookmarks, performSync, recordInteraction } from "./support";

const AVATAR_COLORS = [
  "#e54d2e",
  "#e5484d",
  "#e93d82",
  "#d6409f",
  "#8e4ec6",
  "#6e56cf",
  "#3e63dd",
  "#0090ff",
  "#00a2c7",
  "#12a594",
  "#30a46c",
  "#978365",
  "#f76b15",
  "#e54666",
  "#5b5bd6",
];

const FAVICON_TIMEOUT = 3000;
const FAVICON_MAX_BYTES = 512 * 1024;
const FAVICON_CONCURRENCY = 8;

const XML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => XML_ESCAPES[character]);
}

// Cached failures expire so that an endpoint which later recovers is picked up again.
// No status is treated as permanent, only as "not worth re-checking for a while".
const INVALID_FAVICON_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Maps a favicon URL to the time its failure was recorded.
function getInvalidFavicons(): Map<string, number> {
  const cached = cache.get(INVALID_FAVICONS);
  if (!cached) {
    return new Map();
  }
  try {
    const parsed: unknown = JSON.parse(cached);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return new Map();
    }
    const now = Date.now();
    const entries = Object.entries(parsed as Record<string, unknown>).filter(
      ([, recordedAt]) => typeof recordedAt === "number" && now - recordedAt < INVALID_FAVICON_TTL_MS,
    );
    return new Map(entries as [string, number][]);
  } catch {
    return new Map();
  }
}

// `invalid` is the already-pruned map from getInvalidFavicons, so expired entries
// are dropped from the cache on every write.
function saveInvalidFavicons(invalid: Map<string, number>, faviconUrls: string[]) {
  if (faviconUrls.length === 0) {
    return;
  }
  const now = Date.now();
  for (const faviconUrl of faviconUrls) {
    invalid.set(faviconUrl, now);
  }
  cache.set(INVALID_FAVICONS, JSON.stringify(Object.fromEntries(invalid)));
}

// 4xx statuses that describe a temporary condition rather than a missing favicon.
const TRANSIENT_STATUSES = new Set([408, 425, 429]);

// "invalid" means the favicon is known to be unusable and worth remembering,
// "unavailable" means we could not tell this time and should retry on a later launch.
type FaviconCheck = "valid" | "invalid" | "unavailable";

async function checkFavicon(faviconUrl: string, signal: AbortSignal): Promise<FaviconCheck> {
  try {
    const response = await axios.get(faviconUrl, {
      timeout: FAVICON_TIMEOUT,
      maxRedirects: 5,
      maxContentLength: FAVICON_MAX_BYTES,
      responseType: "arraybuffer",
      signal,
    });
    // Hosts often answer a missing favicon with an HTML error page and a 200 status.
    const contentType = String(response.headers["content-type"] ?? "");
    return contentType.startsWith("image/") ? "valid" : "invalid";
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    // A 4xx suggests the favicon is genuinely missing, so it is worth remembering
    // for a while. Timeouts, rate limits, aborts, network errors and 5xx say nothing
    // about the favicon itself, so they are retried on the next launch.
    const isMissing = status !== undefined && status >= 400 && status < 500 && !TRANSIENT_STATUSES.has(status);
    return isMissing ? "invalid" : "unavailable";
  }
}

async function mapWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      await worker(items[cursor++]);
    }
  });
  await Promise.all(runners);
}

function getRoundedAvatarIcon(name: string): Image.ImageLike {
  const trimmed = name.trim();
  // Split by code point so names starting with an emoji keep a valid character.
  const initial = trimmed.length > 0 ? ([...trimmed][0] as string).toUpperCase() : "?";
  let charSum = 0;
  for (let i = 0; i < name.length; i++) charSum += name.charCodeAt(i);
  const color = AVATAR_COLORS[charSum % AVATAR_COLORS.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="${color}"/><text x="50" y="72" text-anchor="middle" font-size="46" font-family="-apple-system,system-ui,sans-serif" font-weight="600" fill="white">${escapeXml(initial)}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function getBookmarkIcon(bookmark: Bookmark): Image.ImageLike {
  if (bookmark.favicon) {
    return { source: bookmark.favicon, mask: Image.Mask.RoundedRectangle };
  }
  return getRoundedAvatarIcon(bookmark.name || "?");
}

export function Search() {
  const [items, setItems] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    let canceled = false;

    const load = async () => {
      const authenticated = await authenticationCheck();
      if (!authenticated) {
        if (!canceled) {
          setIsLoading(false);
        }
        return;
      }
      let bookmarks = getCachedBookmarks();
      if (bookmarks.length === 0) {
        await performSync();
        bookmarks = getCachedBookmarks();
      }
      if (canceled) {
        return;
      }

      const invalidFavicons = getInvalidFavicons();
      setItems(bookmarks.map((b) => (b.favicon && invalidFavicons.has(b.favicon) ? { ...b, favicon: "" } : b)));
      setIsLoading(false);

      // Bookmarks frequently share a host, so validate each distinct favicon once.
      const pending = [
        ...new Set(bookmarks.map((b) => b.favicon).filter((favicon) => favicon && !invalidFavicons.has(favicon))),
      ];
      const confirmedInvalid: string[] = [];

      await mapWithConcurrency(pending, FAVICON_CONCURRENCY, async (favicon) => {
        if (canceled) {
          return;
        }
        const result = await checkFavicon(favicon, controller.signal);
        if (result === "valid" || canceled) {
          return;
        }
        if (result === "invalid") {
          confirmedInvalid.push(favicon);
        }
        setItems((prev) => prev.map((b) => (b.favicon === favicon ? { ...b, favicon: "" } : b)));
      });

      saveInvalidFavicons(invalidFavicons, confirmedInvalid);
    };

    load();
    return () => {
      canceled = true;
      controller.abort();
    };
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Linkinize bookmarks">
      <List.EmptyView
        title="No bookmarks yet"
        description="Sync to load your active workspace bookmarks."
        actions={
          <ActionPanel>
            <Action
              title="Synchronize"
              onAction={() => launchCommand({ name: "synchronize", type: LaunchType.UserInitiated })}
            />
          </ActionPanel>
        }
      />
      {items
        .sort((a: Bookmark, b: Bookmark) => b.weight - a.weight)
        .map((item: Bookmark) => (
          <List.Item
            key={item.id}
            actions={
              <ActionPanel title={item.name}>
                <Action.OpenInBrowser url={item.url} onOpen={(url) => recordInteraction(url)} />
                <Action.CopyToClipboard title="Copy Link" content={item.url} />
              </ActionPanel>
            }
            icon={getBookmarkIcon(item)}
            subtitle={item.description}
            title={item.name}
          />
        ))}
    </List>
  );
}
