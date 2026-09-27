import {
  ActionPanel,
  Action,
  Icon,
  Image,
  List,
  LaunchProps,
  getPreferenceValues,
  showToast,
  Toast,
  Keyboard,
  openExtensionPreferences,
  LocalStorage,
  Color,
} from "@raycast/api";
import { useEffect, useState, useMemo } from "react";
import { BrowserProfile, SortMode } from "./types";
import { detectAllProfiles } from "./utils/browserDetector";
import { buildTargetUrl } from "./utils/urlHelper";
import { launchBrowserProfile } from "./utils/launcher";
import {
  toggleFavorite,
  removeCustomProfile,
  getSortMode,
  setSortMode,
  getCustomProfileOrder,
  getProfileLaunchCounts,
  recordProfileLaunch,
  setLastSeenVersion,
} from "./utils/storage";
import { AddCustomProfileForm } from "./components/AddCustomProfileForm";
import { RenameProfileForm } from "./components/RenameProfileForm";
import { FeedbackForm } from "./components/FeedbackForm";
import { UserManualView } from "./components/UserManualView";
import { ChangelogView } from "./components/ChangelogView";
import { ReorderProfilesView } from "./components/ReorderProfilesView";

export default function Command(props: LaunchProps<{ arguments: Arguments.BrowserRouter; fallbackText?: string }>) {
  const preferences = getPreferenceValues<Preferences>();

  // Determine if query came from Raycast argument or fallback text
  const initialQuery = (props.arguments?.query || props.fallbackText || "").trim();

  // Mode: "query" (default, typing updates search query/URL) or "filter" (typing filters browser list)
  const [mode, setMode] = useState<"query" | "filter">("query");

  // Preserved state for both modes
  const [searchQuery, setSearchQuery] = useState<string>(initialQuery);
  const [filterText, setFilterText] = useState<string>("");

  const CURRENT_VERSION = "1.1";
  const ANNOUNCEMENT_STORAGE_KEY = `browser_router_announcement_${CURRENT_VERSION}_dismissed`;
  const [hasSeenManual, setHasSeenManual] = useState<boolean | null>(null);
  const [showUpdateBanner, setShowUpdateBanner] = useState<boolean>(false);

  useEffect(() => {
    async function checkFirstRunAndVersion() {
      const [seenManual, dismissed] = await Promise.all([
        LocalStorage.getItem<boolean>("hasSeenUserManual"),
        LocalStorage.getItem<boolean>(ANNOUNCEMENT_STORAGE_KEY),
      ]);

      if (!seenManual) {
        // First-run user: show User Manual, silently mark announcement dismissed so they do not see duplicate intro
        await LocalStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, true);
        await setLastSeenVersion(CURRENT_VERSION);
        setHasSeenManual(false);
        setShowUpdateBanner(false);
      } else {
        setHasSeenManual(true);
        // Existing user: show update banner if not dismissed yet
        if (!dismissed) {
          setShowUpdateBanner(true);
        }
      }
    }
    checkFirstRunAndVersion();
  }, []);

  async function handleDismissUpdateBanner() {
    await LocalStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, true);
    await setLastSeenVersion(CURRENT_VERSION);
    setShowUpdateBanner(false);
    await showToast({
      style: Toast.Style.Success,
      title: "Announcement Dismissed",
    });
  }

  async function handleDismissFirstRun() {
    await LocalStorage.setItem("hasSeenUserManual", true);
    setHasSeenManual(true);
  }

  const [profiles, setProfiles] = useState<BrowserProfile[]>([]);
  const [sortMode, setSortModeState] = useState<SortMode>("alphabetical");
  const [customOrder, setCustomOrderState] = useState<string[]>([]);
  const [launchCounts, setLaunchCountsState] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  async function loadProfiles() {
    setIsLoading(true);
    try {
      const [detected, savedSortMode, savedCustomOrder, savedLaunchCounts] = await Promise.all([
        detectAllProfiles(),
        getSortMode(),
        getCustomProfileOrder(),
        getProfileLaunchCounts(),
      ]);
      setProfiles(detected);
      setSortModeState(savedSortMode);
      setCustomOrderState(savedCustomOrder);
      setLaunchCountsState(savedLaunchCounts);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to detect browsers",
        message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadProfiles();
  }, []);

  const targetUrl = useMemo(() => {
    if (!searchQuery.trim()) return "";
    return buildTargetUrl(searchQuery, preferences.defaultSearchEngine || "google", preferences.customSearchUrl);
  }, [searchQuery, preferences.defaultSearchEngine, preferences.customSearchUrl]);

  async function handleLaunch(profile: BrowserProfile, incognito = false) {
    const success = await launchBrowserProfile(profile, targetUrl || undefined, incognito);
    if (success) {
      await recordProfileLaunch(profile.id);
      setLaunchCountsState((prev) => ({
        ...prev,
        [profile.id]: (prev[profile.id] || 0) + 1,
      }));
    }
  }

  async function handleToggleFavorite(profileId: string) {
    const isFav = await toggleFavorite(profileId);
    setProfiles((prev) => prev.map((p) => (p.id === profileId ? { ...p, isFavorite: isFav } : p)));
    await showToast({
      style: Toast.Style.Success,
      title: isFav ? "Added to Favorites" : "Removed from Favorites",
    });
  }

  async function handleDeleteCustom(profileId: string) {
    await removeCustomProfile(profileId);
    setProfiles((prev) => prev.filter((p) => p.id !== profileId));
    await showToast({
      style: Toast.Style.Success,
      title: "Custom Profile Removed",
    });
  }

  function getSortModeLabel(mode: SortMode): string {
    switch (mode) {
      case "alphabetical":
        return "Alphabetical (A → Z)";
      case "reverse-alphabetical":
        return "Reverse Alphabetical (Z → A)";
      case "frequently-used":
        return "Most Frequently Used";
      case "custom":
        return "Custom Order";
      default:
        return "Alphabetical";
    }
  }

  async function handleSwitchSortMode(mode: SortMode) {
    await setSortMode(mode);
    setSortModeState(mode);
    await showToast({
      style: Toast.Style.Success,
      title: `Sorted by ${getSortModeLabel(mode)}`,
    });
  }

  function handleOrderChanged(newIds: string[], newMode?: SortMode) {
    setCustomOrderState(newIds);
    setSortModeState(newMode || "custom");
  }

  function getSortedProfilesForReorder(): BrowserProfile[] {
    return [...profiles].sort((a, b) => {
      const idxA = customOrder.indexOf(a.id);
      const idxB = customOrder.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      const browserCmp = a.browserName.localeCompare(b.browserName, undefined, { sensitivity: "base" });
      if (browserCmp !== 0) return browserCmp;
      return a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" });
    });
  }

  // Filter profiles when in "filter" mode, or show all when in "query" mode (sorted according to sortMode)
  const displayedProfiles = useMemo(() => {
    const list =
      mode !== "filter" || !filterText.trim()
        ? profiles
        : profiles.filter((p) => {
            const q = filterText.toLowerCase().trim();
            const matchDisplay = p.displayName.toLowerCase().includes(q);
            const matchBrowser = p.browserName.toLowerCase().includes(q);
            const matchProfile = p.profileName.toLowerCase().includes(q);
            const matchDir = p.profileDirectory.toLowerCase().includes(q);
            const matchEmail = p.email ? p.email.toLowerCase().includes(q) : false;
            return matchDisplay || matchBrowser || matchProfile || matchDir || matchEmail;
          });

    return [...list].sort((a, b) => {
      if (sortMode === "reverse-alphabetical") {
        const browserCmp = b.browserName.localeCompare(a.browserName, undefined, { sensitivity: "base" });
        if (browserCmp !== 0) return browserCmp;
        return b.displayName.localeCompare(a.displayName, undefined, { sensitivity: "base" });
      }

      if (sortMode === "frequently-used") {
        const countA = launchCounts[a.id] || 0;
        const countB = launchCounts[b.id] || 0;
        if (countB !== countA) return countB - countA;
        const browserCmp = a.browserName.localeCompare(b.browserName, undefined, { sensitivity: "base" });
        if (browserCmp !== 0) return browserCmp;
        return a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" });
      }

      if (sortMode === "custom") {
        const idxA = customOrder.indexOf(a.id);
        const idxB = customOrder.indexOf(b.id);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        const browserCmp = a.browserName.localeCompare(b.browserName, undefined, { sensitivity: "base" });
        if (browserCmp !== 0) return browserCmp;
        return a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" });
      }

      // Default: "alphabetical"
      const browserCmp = a.browserName.localeCompare(b.browserName, undefined, { sensitivity: "base" });
      if (browserCmp !== 0) return browserCmp;
      return a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" });
    });
  }, [profiles, mode, filterText, sortMode, customOrder, launchCounts]);

  const favorites = useMemo(() => displayedProfiles.filter((p) => p.isFavorite), [displayedProfiles]);
  const allOther = useMemo(() => displayedProfiles.filter((p) => !p.isFavorite), [displayedProfiles]);

  function getProfileIcon(profile: BrowserProfile): Image.ImageLike {
    if (profile.avatarPath) {
      return { source: profile.avatarPath };
    }
    if (profile.iconPath) {
      return { source: profile.iconPath };
    }
    return { source: profile.fallbackIcon };
  }

  function toggleMode() {
    setMode((prev) => (prev === "query" ? "filter" : "query"));
  }

  function renderProfileItem(profile: BrowserProfile) {
    const icon = getProfileIcon(profile);
    const accessories: List.Item.Accessory[] = [];

    if (profile.isFavorite) {
      accessories.push({
        icon: { source: Icon.Star, tintColor: Color.Yellow },
        tooltip: "Favorite Profile",
      });
    }

    if (profile.isCustom) {
      accessories.push({
        tag: { value: "Custom", color: Color.Purple },
      });
    }

    if (sortMode === "custom") {
      const rankIdx = customOrder.indexOf(profile.id);
      if (rankIdx !== -1) {
        accessories.push({ text: `#${rankIdx + 1}` });
      }
    } else if (sortMode === "frequently-used") {
      const count = launchCounts[profile.id] || 0;
      accessories.push({ text: `${count} launch${count === 1 ? "" : "es"}` });
    }

    accessories.push({
      text: `Profile: ${profile.profileDirectory}`,
    });

    return (
      <List.Item
        key={profile.id}
        icon={icon}
        title={profile.displayName}
        accessories={accessories}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action
                title={`Open in ${profile.displayName}`}
                icon={Icon.Globe}
                onAction={() => handleLaunch(profile, false)}
              />
              <Action
                title="Open in Incognito / InPrivate"
                icon={Icon.EyeSlash}
                shortcut={{ modifiers: ["ctrl"], key: "enter" }}
                onAction={() => handleLaunch(profile, true)}
              />
            </ActionPanel.Section>

            <ActionPanel.Section title="Search & Filter Mode">
              <Action
                title={mode === "query" ? "Switch to Profile Filter Mode" : "Switch to Search Query Mode"}
                icon={mode === "query" ? Icon.Filter : Icon.MagnifyingGlass}
                shortcut={{ modifiers: [], key: "tab" }}
                onAction={toggleMode}
              />
              {searchQuery ? (
                <Action
                  title="Clear Search Query"
                  icon={Icon.XMarkCircle}
                  shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                  onAction={() => setSearchQuery("")}
                />
              ) : null}
              {targetUrl ? (
                <Action.CopyToClipboard
                  title="Copy Destination URL"
                  content={targetUrl}
                  shortcut={{ modifiers: ["ctrl"], key: "c" }}
                />
              ) : null}
            </ActionPanel.Section>

            <ActionPanel.Section title="Customize Profile">
              <Action
                title={profile.isFavorite ? "Remove from Favorites" : "Mark as Favorite"}
                icon={Icon.Star}
                shortcut={{ modifiers: ["ctrl"], key: "f" }}
                onAction={() => handleToggleFavorite(profile.id)}
              />
              <Action.Push
                title="Rename Display Name."
                icon={Icon.Pencil}
                shortcut={Keyboard.Shortcut.Common.Edit}
                target={<RenameProfileForm profile={profile} onRenamed={loadProfiles} />}
              />
              <Action.Push
                title="Add Custom Profile."
                icon={Icon.Plus}
                shortcut={Keyboard.Shortcut.Common.New}
                target={<AddCustomProfileForm onProfileAdded={loadProfiles} />}
              />
              {profile.isCustom ? (
                <Action
                  title="Delete Custom Profile"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "backspace" }}
                  onAction={() => handleDeleteCustom(profile.id)}
                />
              ) : null}
            </ActionPanel.Section>

            <ActionPanel.Section title="Profile Sorting & Arrangement">
              <ActionPanel.Submenu
                title={`Sort: ${getSortModeLabel(sortMode)}`}
                icon={Icon.BarChart}
                shortcut={Keyboard.Shortcut.Common.Save}
              >
                <Action
                  title="Alphabetical (a → Z)"
                  icon={sortMode === "alphabetical" ? Icon.Checkmark : Icon.Text}
                  onAction={() => handleSwitchSortMode("alphabetical")}
                />
                <Action
                  title="Reverse Alphabetical (Z → a)"
                  icon={sortMode === "reverse-alphabetical" ? Icon.Checkmark : Icon.Text}
                  onAction={() => handleSwitchSortMode("reverse-alphabetical")}
                />
                <Action
                  title="Most Frequently Used (MRU)"
                  icon={sortMode === "frequently-used" ? Icon.Checkmark : Icon.BarChart}
                  onAction={() => handleSwitchSortMode("frequently-used")}
                />
                <Action
                  title="Custom Order"
                  icon={sortMode === "custom" ? Icon.Checkmark : Icon.List}
                  onAction={() => handleSwitchSortMode("custom")}
                />
              </ActionPanel.Submenu>

              {sortMode === "custom" ? (
                <Action.Push
                  title="Reorder Profiles Layout…"
                  icon={Icon.List}
                  shortcut={Keyboard.Shortcut.Common.OpenWith}
                  target={
                    <ReorderProfilesView
                      initialProfiles={getSortedProfilesForReorder()}
                      onOrderChanged={handleOrderChanged}
                    />
                  }
                />
              ) : null}
            </ActionPanel.Section>

            <ActionPanel.Section title="Help & Feedback">
              <Action.Push
                title="User Manual & Guide"
                icon={Icon.Book}
                shortcut={{ modifiers: ["ctrl"], key: "h" }}
                target={<UserManualView />}
              />
              <Action.Push
                title="Send Feedback / Feature Request"
                icon={Icon.Envelope}
                shortcut={{ modifiers: ["ctrl", "shift"], key: "f" }}
                target={<FeedbackForm />}
              />
              <Action.Push
                title="What's New (Changelog)"
                icon={Icon.Stars}
                shortcut={Keyboard.Shortcut.Common.Copy}
                target={<ChangelogView onDismiss={handleDismissUpdateBanner} />}
              />
            </ActionPanel.Section>

            <ActionPanel.Section>
              <Action
                title="Refresh Browsers & Profiles"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={loadProfiles}
              />
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                shortcut={{ modifiers: ["ctrl"], key: "," }}
                onAction={openExtensionPreferences}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  const placeholderText = mode === "query" ? "Search query or URL..." : "Filter profiles...";

  const sectionTitle =
    mode === "query"
      ? targetUrl
        ? `Destination: ${targetUrl}`
        : "Browsers & Profiles"
      : searchQuery.trim()
        ? `Routing query: "${searchQuery}"`
        : "Filter Profiles";

  if (hasSeenManual === false) {
    return <UserManualView isFirstRun={true} onDismissFirstRun={handleDismissFirstRun} />;
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={placeholderText}
      filtering={false}
      searchText={mode === "query" ? searchQuery : filterText}
      onSearchTextChange={mode === "query" ? setSearchQuery : setFilterText}
      searchBarAccessory={
        <List.Dropdown tooltip="Mode" value={mode} onChange={(val) => setMode(val as "query" | "filter")}>
          <List.Dropdown.Item value="query" title="Search" icon={Icon.MagnifyingGlass} />
          <List.Dropdown.Item value="filter" title="Filter" icon={Icon.Filter} />
        </List.Dropdown>
      }
    >
      {showUpdateBanner ? (
        <List.Section title="Announcement">
          <List.Item
            id="update-announcement-banner"
            icon={{ source: Icon.Stars, tintColor: Color.Purple }}
            title="Browser Router Updated"
            subtitle="See what's new in v1.1"
            accessories={[
              { tag: { value: "NEW", color: Color.Green } },
              { text: "Changelog", icon: Icon.ChevronRight },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View What's New"
                  icon={Icon.Eye}
                  target={<ChangelogView onDismiss={handleDismissUpdateBanner} />}
                  onPush={handleDismissUpdateBanner}
                />
                <Action
                  title="Dismiss Announcement"
                  icon={Icon.XMarkCircle}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={handleDismissUpdateBanner}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}

      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title="No Matching Profiles"
        description={
          mode === "filter"
            ? `No profile matches "${filterText}". Press Tab to return to search query.`
            : "No browser profiles detected. Add a custom profile below."
        }
        actions={
          <ActionPanel>
            <Action
              title="Switch to Search Query Mode"
              icon={Icon.MagnifyingGlass}
              shortcut={{ modifiers: [], key: "tab" }}
              onAction={() => setMode("query")}
            />
            <Action.Push
              title="Add Custom Profile."
              icon={Icon.Plus}
              target={<AddCustomProfileForm onProfileAdded={loadProfiles} />}
            />
            <Action title="Refresh Browsers & Profiles" icon={Icon.ArrowClockwise} onAction={loadProfiles} />
            <Action.Push
              title="Send Feedback / Feature Request"
              icon={Icon.Envelope}
              shortcut={{ modifiers: ["ctrl", "shift"], key: "f" }}
              target={<FeedbackForm />}
            />
          </ActionPanel>
        }
      />

      {sortMode !== "custom" && favorites.length > 0 ? (
        <List.Section title="Favorites">{favorites.map(renderProfileItem)}</List.Section>
      ) : null}

      <List.Section title={sectionTitle}>
        {sortMode === "custom" ? displayedProfiles.map(renderProfileItem) : allOther.map(renderProfileItem)}
      </List.Section>
    </List>
  );
}
