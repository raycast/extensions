import {
  Action,
  ActionPanel,
  closeMainWindow,
  getPreferenceValues,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { createDeeplink } from "@raycast/utils";
import { BROWSERS } from "./browsers";
import { openOrFocusProfile } from "./open-profile";
import { scanAllProfiles } from "./profiles";
import { getCachedProfiles, setCachedProfiles, getFavorites, setFavorites } from "./storage";
import { Browser, Profile } from "./types";
import { BrowserWindow, getOpenWindows, probeWindowProfiles, focusWindowByTitle } from "./window-manager";

interface ExtPreferences {
  enableChrome: boolean;
  enableEdge: boolean;
  enableBrave: boolean;
  enableArc: boolean;
  enableVivaldi: boolean;
}

const PREF_KEY_MAP: Record<string, keyof ExtPreferences> = {
  chrome: "enableChrome",
  edge: "enableEdge",
  brave: "enableBrave",
  arc: "enableArc",
  vivaldi: "enableVivaldi",
};

function getEnabledBrowsers() {
  const prefs = getPreferenceValues<ExtPreferences>();
  return BROWSERS.filter((b) => {
    const key = PREF_KEY_MAP[b.id];
    return key ? prefs[key] : true;
  });
}

interface OpenWindowItem {
  browser: Browser;
  window: BrowserWindow;
  profileName: string | null;
}

export default function BrowseProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [openWindows, setOpenWindows] = useState<OpenWindowItem[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const enabledBrowsers = getEnabledBrowsers();

  async function loadProfiles() {
    setIsLoading(true);
    try {
      const [cached, favs] = await Promise.all([getCachedProfiles(), getFavorites()]);
      setFavoriteIds(favs);
      if (cached && cached.profiles.length > 0) {
        const enabledIds = new Set(enabledBrowsers.map((b) => b.id));
        setProfiles(cached.profiles.filter((p) => enabledIds.has(p.browserId)));
      } else {
        await refreshProfiles();
      }
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load profiles",
      });
    }
    setIsLoading(false);
  }

  async function loadOpenWindows() {
    const items: OpenWindowItem[] = [];
    for (const browser of enabledBrowsers) {
      let windows = await getOpenWindows(browser.name);
      if (windows.length > 0) {
        windows = await probeWindowProfiles(browser.name, windows);
      }
      for (const w of windows) {
        // Find the profile display name for this window
        let profileName: string | null = null;
        if (w.profileDirectory) {
          const matchingProfile = profiles.find(
            (p) => p.browserId === browser.id && p.directoryName === w.profileDirectory,
          );
          profileName = matchingProfile?.displayName || w.profileDirectory;
        }
        items.push({ browser, window: w, profileName });
      }
    }
    setOpenWindows(items);
  }

  async function refreshProfiles() {
    setIsLoading(true);
    try {
      const scanned = await scanAllProfiles(enabledBrowsers);
      setProfiles(scanned);
      await setCachedProfiles(scanned);
      await showToast({
        style: Toast.Style.Success,
        title: "Profiles refreshed",
      });
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to scan profiles",
      });
    }
    setIsLoading(false);
  }

  async function handleToggleFavorite(profileId: string) {
    const isFav = favoriteIds.includes(profileId);
    const updated = isFav ? favoriteIds.filter((id) => id !== profileId) : [...favoriteIds, profileId];
    setFavoriteIds(updated);
    await setFavorites(updated);
  }

  useEffect(() => {
    loadProfiles();
  }, []);

  // Load open windows after profiles are available (to resolve profile names)
  useEffect(() => {
    if (profiles.length > 0) {
      loadOpenWindows();
    }
  }, [profiles]);

  async function handleOpenProfile(profile: Profile) {
    const browser = BROWSERS.find((b) => b.id === profile.browserId);
    if (!browser) return;
    await openOrFocusProfile(
      browser.name,
      browser.processName,
      browser.profileRootPath,
      profile.directoryName,
      profile.displayName,
    );
  }

  async function handleFocusWindow(item: OpenWindowItem) {
    await focusWindowByTitle(item.browser.name, item.window.title);
  }

  const favoriteSet = new Set(favoriteIds);
  const favoriteProfiles = profiles.filter((p) => favoriteSet.has(p.id));
  const nonFavoriteProfiles = profiles.filter((p) => !favoriteSet.has(p.id));
  const profilesByBrowser = groupByBrowser(nonFavoriteProfiles);
  const installedBrowserIds = new Set(profiles.map((p) => p.browserId));

  function renderProfileItem(profile: Profile) {
    const browser = BROWSERS.find((b) => b.id === profile.browserId);
    if (!browser) return null;
    const isFav = favoriteSet.has(profile.id);

    return (
      <List.Item
        key={profile.id}
        title={profile.displayName}
        subtitle={profile.gaiaName || undefined}
        icon={profile.avatarPath ? { fileIcon: profile.avatarPath } : { source: browser.icon }}
        accessories={[...(isFav ? [{ icon: Icon.Star }] : []), { text: browser.name }]}
        actions={
          <ActionPanel>
            <Action
              title="Open Profile"
              icon={Icon.Globe}
              onAction={async () => {
                await handleOpenProfile(profile);
                await closeMainWindow();
              }}
            />
            <Action.CreateQuicklink
              title="Create Quicklink"
              icon={Icon.Link}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
              quicklink={{
                name: `Open ${profile.displayName} — ${browser.name}`,
                link: createDeeplink({
                  command: "open-profile",
                  context: {
                    browserId: profile.browserId,
                    profileDirectory: profile.directoryName,
                    displayName: profile.displayName,
                  },
                }),
              }}
            />
            <Action
              title={isFav ? "Remove from Favorites" : "Add to Favorites"}
              icon={isFav ? Icon.StarDisabled : Icon.Star}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              onAction={() => handleToggleFavorite(profile.id)}
            />
            <Action
              title="Refresh Profiles"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={refreshProfiles}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search profiles...">
      {profiles.length === 0 && !isLoading ? (
        enabledBrowsers.length === 0 ? (
          <List.EmptyView
            title="All Browsers Disabled"
            description="Enable at least one browser in extension preferences"
            icon={Icon.Gear}
            actions={
              <ActionPanel>
                <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              </ActionPanel>
            }
          />
        ) : (
          <List.EmptyView
            title="No Supported Browsers Found"
            description="Install one of: Google Chrome, Microsoft Edge, Brave Browser, Arc, or Vivaldi"
            icon={Icon.Globe}
          />
        )
      ) : (
        <>
          {openWindows.length > 0 && (
            <List.Section title="Open Windows" subtitle={`${openWindows.length} windows`}>
              {openWindows.map((item) => (
                <List.Item
                  key={`window-${item.window.windowId}`}
                  title={item.window.firstTabTitle}
                  subtitle={item.window.firstTabUrl}
                  icon={Icon.Window}
                  accessories={[...(item.profileName ? [{ tag: item.profileName }] : []), { text: item.browser.name }]}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Focus Window"
                        icon={Icon.Eye}
                        onAction={async () => {
                          await handleFocusWindow(item);
                          await closeMainWindow();
                        }}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
          {favoriteProfiles.length > 0 && (
            <List.Section title="Favorites" subtitle={`${favoriteProfiles.length} profiles`}>
              {favoriteProfiles.map(renderProfileItem)}
            </List.Section>
          )}
          {BROWSERS.filter((b) => installedBrowserIds.has(b.id)).map((browser) => {
            const browserProfiles = profilesByBrowser.get(browser.id) || [];
            if (browserProfiles.length === 0) return null;
            return (
              <List.Section key={browser.id} title={browser.name} subtitle={`${browserProfiles.length} profiles`}>
                {browserProfiles.map(renderProfileItem)}
              </List.Section>
            );
          })}
        </>
      )}
    </List>
  );
}

function groupByBrowser(profiles: Profile[]): Map<string, Profile[]> {
  const map = new Map<string, Profile[]>();
  for (const profile of profiles) {
    const existing = map.get(profile.browserId) || [];
    existing.push(profile);
    map.set(profile.browserId, existing);
  }
  return map;
}
