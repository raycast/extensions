import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Image,
  Keyboard,
  LaunchType,
  List,
  Toast,
  closeMainWindow,
  launchCommand,
  showToast,
} from "@raycast/api";
import { MutatePromise, getAvatarIcon, usePromise } from "@raycast/utils";
import { execFile } from "child_process";
import { existsSync, watch } from "fs";
import { homedir } from "os";
import { join } from "path";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type ClassifiedError,
  FailureMode,
  classifyError,
  fetchWithRetry,
  showActionError,
} from "./lib/errors";
import { AMO_URL } from "./lib/constants";
import { getPort } from "./lib/setup";

// -- Types matching the native host HTTP API response --

interface Tab {
  id: number;
  windowId: number;
  title: string;
  url: string;
  favIconUrl: string | null;
  active: boolean;
  pinned: boolean;
  incognito: boolean;
  status: string;
  lastAccessed: number;
  cookieStoreId: string;
  container: {
    name: string;
    color: string;
    colorCode: string;
    icon: string;
  } | null;
}

interface TabsResponse {
  ok: boolean;
  data: {
    tabs: Tab[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  };
  meta: { count: number; timestamp: number };
}

const PORT_PATH = join(homedir(), ".raycast-firefox", "port");

// -- URL helpers --

/**
 * Extract hostname from a URL string. Returns empty string on parse failure.
 */
function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

/**
 * Clean a URL for display: hostname (without www.) + pathname (omit if just "/").
 * Returns raw URL on parse failure.
 */
function cleanUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, "");
    const pathname = parsed.pathname === "/" ? "" : parsed.pathname;
    return hostname + pathname;
  } catch {
    return url;
  }
}

/**
 * Extract searchable keywords from a URL.
 * Includes the full URL string so search matches protocol and query params
 * even though the subtitle now shows the cleaned URL.
 */
function urlKeywords(url: string): string[] {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    const hostParts = hostname.split(".").filter(Boolean);
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    return [url, hostname, ...hostParts, ...pathParts];
  } catch {
    return [url];
  }
}

// -- Fallback icon helpers --

/**
 * 14-color palette for domain-based letter avatars.
 * Same palette as used by @raycast/utils getAvatarIcon.
 */
const AVATAR_COLORS = [
  "#DC829A",
  "#D64854",
  "#D47600",
  "#D36CDD",
  "#52A9E4",
  "#7871E8",
  "#70920F",
  "#43B93A",
  "#EB6B3E",
  "#26B795",
  "#D85A9B",
  "#A067DC",
  "#BD9500",
  "#5385D9",
];

/**
 * DJB2 hash of a hostname to deterministically select a color from the palette.
 */
function domainColor(hostname: string): string {
  let hash = 5381;
  for (let i = 0; i < hostname.length; i++) {
    hash = (hash * 33) ^ hostname.charCodeAt(i);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/**
 * Return a fallback icon for a tab:
 * - about:* pages -> Firefox icon
 * - Loading tabs -> CircleProgress spinner
 * - Otherwise -> letter avatar colored by domain
 */
function getFallbackIcon(tab: Tab): Image.ImageLike {
  if (tab.url.startsWith("about:")) {
    return { source: "firefox-icon.png" };
  }
  if (tab.status === "loading") {
    return Icon.CircleProgress;
  }
  const hostname = getHostname(tab.url);
  // Use charAt(0) and check for surrogates — emoji first chars are lone
  // high surrogates which crash encodeURIComponent inside getAvatarIcon.
  const raw = tab.title?.[0] ?? "";
  const code = raw.charCodeAt(0);
  const isSurrogate = code >= 0xd800 && code <= 0xdfff;
  const letter = (
    (isSurrogate ? "" : raw) ||
    hostname?.[0] ||
    "?"
  ).toUpperCase();
  return getAvatarIcon(letter, {
    background: domainColor(hostname),
    gradient: false,
  });
}

/**
 * Return the best available icon for a tab:
 * - If a cached favicon data URI is available, use it
 * - Otherwise fall back to letter avatar / Firefox icon / loading spinner
 */
function getTabIcon(
  tab: Tab,
  favicons: Record<string, string>,
): Image.ImageLike {
  // Use data URIs directly from Firefox (most common case)
  if (tab.favIconUrl?.startsWith("data:")) {
    return { source: tab.favIconUrl, mask: Image.Mask.RoundedRectangle };
  }
  // Use cached favicon fetched via native host for http(s) URLs
  if (tab.favIconUrl && favicons[tab.favIconUrl]) {
    return {
      source: favicons[tab.favIconUrl],
      mask: Image.Mask.RoundedRectangle,
    };
  }
  return getFallbackIcon(tab);
}

// -- Accessory helpers --

const CONTAINER_COLORS: Record<string, Color> = {
  blue: Color.Blue,
  turquoise: Color.Blue,
  green: Color.Green,
  yellow: Color.Yellow,
  orange: Color.Orange,
  red: Color.Red,
  pink: Color.Magenta,
  purple: Color.Purple,
};

/**
 * Get the 1-based window number for a windowId given a sorted list of all window IDs.
 */
function getWindowNumber(windowId: number, allWindowIds: number[]): number {
  const idx = allWindowIds.indexOf(windowId);
  return idx >= 0 ? idx + 1 : 1;
}

/**
 * Build the accessories array for a List.Item.
 * Order: Pin icon, Active tag, Container tag, Window tag.
 */
function buildAccessories(
  tab: Tab,
  windowNumber: number,
): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  if (tab.pinned) {
    accessories.push({ icon: Icon.Pin, tooltip: "Pinned" });
  }
  if (tab.active) {
    accessories.push({ tag: { value: "Active", color: Color.Green } });
  }
  if (tab.container) {
    accessories.push({
      tag: {
        value: tab.container.name,
        color: CONTAINER_COLORS[tab.container.color] || Color.SecondaryText,
      },
    });
  }
  accessories.push({
    tag: { value: "W" + windowNumber, color: Color.SecondaryText },
  });

  return accessories;
}

// -- Tab switching --

async function switchTab(tabId: number, windowId: number) {
  await closeMainWindow({ clearRootSearch: true });
  try {
    const response = await fetch(`http://127.0.0.1:${getPort()}/switch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tabId, windowId }),
    });
    if (!response.ok) {
      const body = (await response
        .json()
        .catch(() => ({ error: "Unknown error" }))) as { error?: string };
      throw new Error(body.error ?? `HTTP ${response.status}`);
    }
  } catch (error) {
    await showActionError(error, "switch tab");
  }
}

// -- Tab closing --

async function closeTab(
  tabId: number,
  mutate: MutatePromise<Tab[], undefined>,
) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Closing tab...",
  });
  try {
    await mutate(
      (async () => {
        const res = await fetch(`http://127.0.0.1:${getPort()}/close`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tabId }),
        });
        if (!res.ok) {
          const body = (await res
            .json()
            .catch(() => ({ error: "Unknown error" }))) as { error?: string };
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
      })(),
      {
        optimisticUpdate(data) {
          return (data ?? []).filter((t) => t.id !== tabId);
        },
      },
    );
    toast.style = Toast.Style.Success;
    toast.title = "Tab closed";
  } catch (error) {
    toast.hide();
    await showActionError(error, "close tab");
  }
}

// -- Fetch all tabs (handles pagination) --

async function fetchAllTabs(): Promise<Tab[]> {
  const allTabs: Tab[] = [];
  let hasMore = true;
  const maxPages = 20;
  let pages = 0;

  while (hasMore && pages < maxPages) {
    const res = await fetch(
      `http://127.0.0.1:${getPort()}/tabs?offset=${allTabs.length}`,
    );
    if (!res.ok) {
      const body = (await res
        .json()
        .catch(() => ({ error: "Unknown error" }))) as { error?: string };
      throw new Error(body.error ?? `HTTP ${res.status}`);
    }
    const json = (await res.json()) as TabsResponse;
    const batch = json.data?.tabs ?? [];
    if (batch.length === 0) break;
    allTabs.push(...batch);
    hasMore = json.data?.hasMore ?? false;
    pages++;
  }

  return allTabs;
}

// -- Error empty view --

const ERROR_ICONS: Record<FailureMode, Icon> = {
  [FailureMode.FirefoxNotRunning]: Icon.Globe,
  [FailureMode.ExtensionNotInstalled]: Icon.Plug,
  [FailureMode.HostNotRunning]: Icon.Terminal,
  [FailureMode.Unknown]: Icon.ExclamationMark,
};

// -- Component --

export default function SearchTabs() {
  const [classifiedError, setClassifiedError] =
    useState<ClassifiedError | null>(null);

  const handleError = useCallback(async (error: Error) => {
    setClassifiedError(await classifyError(error));
  }, []);

  const handleData = useCallback(() => {
    setClassifiedError(null);
  }, []);

  const {
    data: tabs = [],
    isLoading,
    revalidate,
    mutate,
  } = usePromise(
    () => {
      // Fast-fail: if port file is gone, no host is listening — skip retries.
      // Use a distinct error message so classifyError skips pgrep (avoids
      // race condition during Firefox shutdown where process lingers briefly).
      if (!existsSync(PORT_PATH)) {
        return Promise.reject(new Error("port-file-missing"));
      }
      return fetchWithRetry(fetchAllTabs);
    },
    [],
    {
      onError: handleError,
      onData: handleData,
    },
  );
  // Watch ~/.raycast-firefox/port for changes. The native host writes this
  // file on startup and removes it when Firefox disconnects (stdin EOF).
  // This gives instant push-based detection of both transitions:
  //   host starts  → port file created  → revalidate → tabs load
  //   Firefox quits → port file removed → revalidate → error shown
  useEffect(() => {
    const dir = join(homedir(), ".raycast-firefox");
    try {
      const watcher = watch(dir, (_event, filename) => {
        if (filename === "port") {
          if (existsSync(PORT_PATH)) {
            // Port file created — host just started
            setTimeout(revalidate, 500);
          } else {
            // Port file removed — Firefox disconnected
            setTimeout(revalidate, 500);
          }
        }
      });
      return () => watcher.close();
    } catch {
      // Directory doesn't exist yet — user needs manual setup
    }
  }, [revalidate]);

  const [favicons, setFavicons] = useState<Record<string, string>>({});
  const fetchedRef = useRef<Set<string>>(new Set());

  // Fetch favicons for all tabs that have a favIconUrl
  useEffect(() => {
    if (!tabs || tabs.length === 0) return;

    // Collect unique http(s) favIconUrls that we haven't fetched yet.
    // Data URIs are used directly by getTabIcon — no proxy needed.
    const urlsToFetch = [
      ...new Set(
        tabs
          .filter(
            (t) =>
              t.favIconUrl &&
              !t.favIconUrl.startsWith("data:") &&
              !favicons[t.favIconUrl] &&
              !fetchedRef.current.has(t.favIconUrl),
          )
          .map((t) => t.favIconUrl as string),
      ),
    ];

    if (urlsToFetch.length === 0) return;

    // Mark as in-flight so we don't re-fetch on next render
    for (const url of urlsToFetch) {
      fetchedRef.current.add(url);
    }

    // Fetch all favicons in parallel, batch-update state when all settle
    const results: Record<string, string> = {};
    let settled = 0;

    urlsToFetch.forEach(async (url) => {
      try {
        const res = await fetch(
          `http://127.0.0.1:${getPort()}/favicon?url=${encodeURIComponent(url)}`,
        );
        if (res.ok) {
          const json = (await res.json()) as {
            ok: boolean;
            data?: { dataUri: string };
          };
          if (json.ok && json.data?.dataUri) {
            results[url] = json.data.dataUri;
          }
        }
      } catch {
        // Favicon fetch failed -- fallback icon will be used
      } finally {
        settled++;
        if (settled === urlsToFetch.length) {
          setFavicons((prev) => ({ ...prev, ...results }));
        }
      }
    });
  }, [tabs]);

  // Sort tabs by most recently accessed first
  const sortedTabs = [...tabs].sort(
    (a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0),
  );

  // Compute unique sorted window IDs for window number assignment
  const windowIds = [...new Set(sortedTabs.map((t) => t.windowId))].sort(
    (a, b) => a - b,
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Firefox tabs...">
      <List.EmptyView
        icon={
          classifiedError
            ? ERROR_ICONS[classifiedError.mode]
            : Icon.MagnifyingGlass
        }
        title={classifiedError ? classifiedError.title : "No Results"}
        description={classifiedError?.description}
        actions={
          classifiedError ? (
            <ActionPanel>
              {classifiedError.mode === FailureMode.FirefoxNotRunning && (
                <Action
                  title="Launch Firefox"
                  icon={Icon.Globe}
                  onAction={() => {
                    execFile("open", ["-a", "Firefox"]);
                    setTimeout(revalidate, 2000);
                  }}
                />
              )}
              {classifiedError.mode === FailureMode.ExtensionNotInstalled && (
                <Action.OpenInBrowser
                  title="Install Firefox Extension"
                  url={AMO_URL}
                />
              )}
              {classifiedError.mode === FailureMode.HostNotRunning && (
                <Action
                  title="Set up Native Host"
                  icon={Icon.Terminal}
                  onAction={async () => {
                    await launchCommand({
                      name: "setup-bridge",
                      type: LaunchType.UserInitiated,
                    });
                  }}
                />
              )}
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={revalidate}
              />
            </ActionPanel>
          ) : undefined
        }
      />
      {sortedTabs.map((tab) => (
        <List.Item
          key={String(tab.id)}
          icon={getTabIcon(tab, favicons)}
          title={tab.title || "Untitled"}
          subtitle={cleanUrl(tab.url)}
          keywords={urlKeywords(tab.url)}
          accessories={buildAccessories(
            tab,
            getWindowNumber(tab.windowId, windowIds),
          )}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action
                  title="Switch to Tab"
                  icon={Icon.Globe}
                  onAction={() => switchTab(tab.id, tab.windowId)}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Close Tab"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => closeTab(tab.id, mutate)}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
