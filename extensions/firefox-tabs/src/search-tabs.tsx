import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Image,
  Keyboard,
  List,
  Toast,
  closeMainWindow,
  showToast,
} from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import { execFile } from "child_process";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { type ClassifiedError, FailureMode, classifyError, fetchWithRetry, showActionError } from "./lib/errors";
import { AMO_URL } from "./lib/constants";
import { faviconPath } from "./lib/favicon-cache";
import {
  HOST_TIMEOUT_MS,
  type Host,
  TAB_REFRESH_MS,
  fetchFromHosts,
  numberWindows,
  readHosts,
  tabKey,
  tabsChanged,
  windowKey,
} from "./lib/hosts";
import { SETUP_RECHECK_MS, profilesNeedingSetup, sameSetup } from "./lib/profile-status";
import {
  HOST_RESTART_GRACE_MS,
  type TabAction,
  type TabState,
  initialTabState,
  needsFullLoad,
  tabReducer,
  visibleTabs as tabsToShow,
  waitForHosts,
} from "./lib/tab-store";
import { ProfileSetupItem, SetupAction, openSetupCommand, profileColor, profileIcon } from "./lib/profile-ui";
import { type ProfileLabel, labelHosts } from "./lib/profiles";
import { loadProfileStatuses } from "./lib/setup-status";
import { useHostsWatcher } from "./lib/use-hosts-watcher";
import { updateOutdatedHost } from "./lib/host-update";

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

/** A tab together with the native host (and so the Firefox profile) it came from. */
interface HostTab extends Tab {
  host: Host;
}

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
  const letter = ((isSurrogate ? "" : raw) || hostname?.[0] || "?").toUpperCase();
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
function getTabIcon(tab: Tab, favicons: Record<string, string>): Image.ImageLike {
  // Data URIs come directly from Firefox (most common case); http(s)
  // favicons are fetched via the native host into `favicons`.
  const dataUri = tab.favIconUrl?.startsWith("data:") ? tab.favIconUrl : tab.favIconUrl && favicons[tab.favIconUrl];
  if (dataUri) {
    return {
      source: faviconPath(dataUri) ?? dataUri,
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
 * Build the accessories array for a List.Item.
 * Order: Pin icon, Active tag, Container tag, Window tag.
 *
 * With more than one profile connected, the window tag shows the profile's
 * avatar and is coloured per profile.
 */
function buildAccessories(tab: Tab, windowNumber: number, profile: ProfileLabel | null): List.Item.Accessory[] {
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
  if (profile) {
    const color = profileColor(profile);
    accessories.push({
      tag: { value: "W" + windowNumber, color },
      icon: profileIcon(profile),
      tooltip: `${profile.name}, window ${windowNumber}`,
    });
  } else {
    accessories.push({
      tag: { value: "W" + windowNumber, color: Color.SecondaryText },
    });
  }

  return accessories;
}

// -- Tab switching --

async function switchTab(tab: HostTab) {
  await closeMainWindow({ clearRootSearch: true });
  try {
    const response = await fetch(`http://127.0.0.1:${tab.host.port}/switch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tabId: tab.id, windowId: tab.windowId }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({ error: "Unknown error" }))) as { error?: string };
      throw new Error(body.error ?? `HTTP ${response.status}`);
    }
  } catch (error) {
    await showActionError(error, "switch tab");
  }
}

// -- Tab closing --

/**
 * Close a tab in its own profile. `settle` reports whether it worked, so the
 * list can drop the tab for good or bring it back.
 */
async function closeTab(tab: HostTab, settle: (ok: boolean) => void) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Closing tab...",
  });
  try {
    const res = await fetch(`http://127.0.0.1:${tab.host.port}/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tabId: tab.id }),
      signal: AbortSignal.timeout(HOST_TIMEOUT_MS),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({ error: "Unknown error" }))) as { error?: string };
      throw new Error(body.error ?? `HTTP ${res.status}`);
    }
    settle(true);
    toast.style = Toast.Style.Success;
    toast.title = "Tab closed";
  } catch (error) {
    settle(false);
    toast.hide();
    await showActionError(error, "close tab");
  }
}

// -- Fetch all tabs (handles pagination) --

async function fetchAllTabs(host: Host): Promise<HostTab[]> {
  const allTabs: HostTab[] = [];
  let hasMore = true;
  const maxPages = 20;
  let pages = 0;

  while (hasMore && pages < maxPages) {
    const res = await fetch(`http://127.0.0.1:${host.port}/tabs?offset=${allTabs.length}`, {
      signal: AbortSignal.timeout(HOST_TIMEOUT_MS),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({ error: "Unknown error" }))) as { error?: string };
      throw new Error(body.error ?? `HTTP ${res.status}`);
    }
    const json = (await res.json()) as TabsResponse;
    const batch = json.data?.tabs ?? [];
    if (batch.length === 0) break;
    allTabs.push(...batch.map((tab) => ({ ...tab, host })));
    hasMore = json.data?.hasMore ?? false;
    pages++;
  }

  return allTabs;
}

/**
 * Fetch tabs from every running Firefox profile. Hosts are re-read on each
 * call so retries pick up a host that has just started.
 */
async function fetchTabsFromAllHosts(): Promise<HostTab[]> {
  const hosts = readHosts();
  // Distinct error so classifyError skips pgrep (avoids a race during
  // Firefox shutdown where the process lingers briefly).
  if (hosts.length === 0) throw new Error("port-file-missing");
  return fetchFromHosts(hosts, fetchAllTabs);
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
  const [state, dispatch] = useReducer(
    (current: TabState<HostTab>, action: TabAction<HostTab>) => tabReducer(current, action, tabsChanged),
    undefined,
    () => initialTabState<HostTab>()
  );
  const tabs = tabsToShow(state);
  const [isLoading, setIsLoading] = useState(true);
  const [classifiedError, setClassifiedError] = useState<ClassifiedError | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const loading = useRef(false);
  const loadSeq = useRef(0);

  // A full load: on open, on Retry, and when a host starts or stops. Only the
  // newest load's result is applied.
  const reload = useCallback(async () => {
    const seq = ++loadSeq.current;
    const startedAt = stateRef.current.version;
    loading.current = true;
    setIsLoading(true);
    try {
      // Hosts vanish for a moment when they restart (after a native host
      // update, or when Firefox updates the companion extension). A list that
      // had tabs waits for them instead of reporting Firefox as not set up.
      const hosts =
        stateRef.current.tabs.length > 0 ? await waitForHosts(readHosts, HOST_RESTART_GRACE_MS) : readHosts();
      // Distinct error so classifyError skips pgrep (avoids a race during
      // Firefox shutdown where the process lingers briefly).
      if (hosts.length === 0) throw new Error("port-file-missing");
      const fresh = await fetchWithRetry(fetchTabsFromAllHosts);
      if (seq !== loadSeq.current) return;
      dispatch({ type: "loaded", tabs: fresh, startedAt });
      setClassifiedError(null);
    } catch (error) {
      if (seq !== loadSeq.current) return;
      dispatch({ type: "loadFailed", error });
      const classified = await classifyError(error);
      if (seq === loadSeq.current) setClassifiedError(classified);
    } finally {
      if (seq === loadSeq.current) {
        loading.current = false;
        setIsLoading(false);
      }
    }
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);
  useHostsWatcher(reload);

  // Raycast keeps this command open between uses, so re-read tabs while it
  // is: otherwise tabs opened, closed or navigated in Firefox don't show
  // until the command is opened afresh. Refreshes skip the loading indicator,
  // only re-render when something shown changed (see tabReducer), and hand
  // over to a full load when every host keeps failing or all hosts are gone.
  useEffect(() => {
    let inFlight = false;
    const timer = setInterval(async () => {
      if (inFlight || loading.current) return;
      const current = stateRef.current;
      if (needsFullLoad(current) || (readHosts().length === 0 && current.tabs.length > 0)) {
        reload();
        return;
      }
      if (readHosts().length === 0) return;
      inFlight = true;
      const startedAt = current.version;
      try {
        dispatch({ type: "refreshed", tabs: await fetchTabsFromAllHosts(), startedAt });
      } catch {
        dispatch({ type: "refreshFailed", startedAt });
      } finally {
        inFlight = false;
      }
    }, TAB_REFRESH_MS);
    return () => clearInterval(timer);
  }, [reload]);

  // Bring an installed native host up to the pinned release. The update
  // restarts the running hosts; the list waits for them to come back.
  useEffect(() => {
    updateOutdatedHost();
  }, []);

  // Profile setup is re-checked when the connected hosts or the error change,
  // and every SETUP_RECHECK_MS, because a profile that needs setup has no
  // host: starting or quitting it changes nothing else the list can see.
  // State only changes when the result does, so an unchanged check doesn't
  // re-render the list.
  const errorShown = state.error ? classifiedError : null;
  const hostSignature = [...new Set(tabs.map((t) => t.host.key))].sort().join(",");
  const [setup, setSetup] = useState<Awaited<ReturnType<typeof loadProfileStatuses>>>();
  const setupSeq = useRef(0);
  const recheckSetup = useCallback(async () => {
    const seq = ++setupSeq.current;
    const next = await loadProfileStatuses();
    // Checks can overlap (timer, host changes, Retry): keep only the newest.
    if (seq !== setupSeq.current) return;
    setSetup((previous) => (previous && sameSetup(previous, next) ? previous : next));
  }, []);
  const errorMode = errorShown?.mode;
  useEffect(() => {
    recheckSetup();
  }, [hostSignature, errorMode, recheckSetup]);
  useEffect(() => {
    const timer = setInterval(recheckSetup, SETUP_RECHECK_MS);
    return () => clearInterval(timer);
  }, [recheckSetup]);
  const retry = () => {
    reload();
    recheckSetup();
  };
  const profiles = setup?.profiles ?? [];
  const needsSetup = profilesNeedingSetup(setup?.statuses ?? []);
  const [profileFilter, setProfileFilter] = useState("all");

  // Label each connected profile. With a single profile there is nothing to
  // tell apart, so tabs keep the plain window tag.
  const profileLabels = useMemo(
    () =>
      labelHosts(
        tabs.map((t) => t.host),
        profiles
      ),
    [tabs, profiles]
  );

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
              !fetchedRef.current.has(t.favIconUrl)
          )
          .map((t) => t.favIconUrl as string)
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
        const port = readHosts()[0]?.port ?? tabs[0].host.port;
        const res = await fetch(`http://127.0.0.1:${port}/favicon?url=${encodeURIComponent(url)}`, {
          signal: AbortSignal.timeout(HOST_TIMEOUT_MS),
        });
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
        // The host couldn't be reached: forget the URL so a later render
        // tries again. A favicon the host reports as unavailable isn't retried.
        fetchedRef.current.delete(url);
      } finally {
        settled++;
        if (settled === urlsToFetch.length) {
          setFavicons((prev) => ({ ...prev, ...results }));
        }
      }
    });
  }, [tabs]);

  // Sort tabs by most recently accessed first
  // A filtered profile that has since quit falls back to showing every profile.
  const activeFilter = profileLabels.has(profileFilter) ? profileFilter : "all";
  const visibleTabs = activeFilter === "all" ? tabs : tabs.filter((t) => t.host.key === activeFilter);
  const sortedTabs = [...visibleTabs].sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0));

  // Number windows across all profiles, grouped by profile, so each W<n> is
  // unique and a profile's windows sit together.
  const windowNumbers = useMemo(
    () => numberWindows(tabs, (hostKey) => profileLabels.get(hostKey)?.colorIndex ?? 0),
    [tabs, profileLabels]
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Firefox tabs..."
      searchBarAccessory={
        profileLabels.size > 1 ? (
          <List.Dropdown tooltip="Firefox Profile" value={activeFilter} onChange={setProfileFilter}>
            <List.Dropdown.Item title="All Profiles" value="all" icon={Icon.Globe} />
            {[...profileLabels].map(([key, label]) => (
              <List.Dropdown.Item key={key} title={label.name} value={key} icon={profileIcon(label)} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      <List.EmptyView
        icon={errorShown ? ERROR_ICONS[errorShown.mode] : Icon.MagnifyingGlass}
        title={errorShown ? errorShown.title : "No Results"}
        description={errorShown?.description}
        actions={
          errorShown ? (
            <ActionPanel>
              {errorShown.mode === FailureMode.FirefoxNotRunning && (
                <Action
                  title="Launch Firefox"
                  icon={Icon.Globe}
                  onAction={() => {
                    execFile("open", ["-a", "Firefox"]);
                    setTimeout(reload, 2000);
                  }}
                />
              )}
              {errorShown.mode === FailureMode.ExtensionNotInstalled && (
                <Action.OpenInBrowser title="Install Firefox Extension" url={AMO_URL} />
              )}
              {errorShown.mode === FailureMode.HostNotRunning && (
                <Action title="Set up Native Host" icon={Icon.Terminal} onAction={openSetupCommand} />
              )}
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={retry}
              />
            </ActionPanel>
          ) : undefined
        }
      />
      {activeFilter === "all" && needsSetup.length > 0 && (
        <List.Section title="Needs Setup">
          {needsSetup.map((status) => (
            <ProfileSetupItem
              key={status.profile.path}
              status={status}
              profiles={profiles}
              actions={
                <ActionPanel>
                  <SetupAction status={status} />
                  <Action
                    title="Retry"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={retry}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {sortedTabs.map((tab) => {
        const profile = profileLabels.get(tab.host.key) ?? null;
        return (
          <List.Item
            key={tabKey(tab)}
            icon={getTabIcon(tab, favicons)}
            title={tab.title || "Untitled"}
            subtitle={cleanUrl(tab.url)}
            keywords={profile ? [...urlKeywords(tab.url), ...profile.name.split(/\s+/)] : urlKeywords(tab.url)}
            accessories={buildAccessories(tab, windowNumbers.get(windowKey(tab)) ?? 1, profile)}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action title="Switch to Tab" icon={Icon.Globe} onAction={() => switchTab(tab)} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Close Tab"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() => {
                      const key = tabKey(tab);
                      dispatch({ type: "closeStarted", key });
                      closeTab(tab, (ok) => dispatch({ type: "closeSettled", key, ok }));
                    }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
