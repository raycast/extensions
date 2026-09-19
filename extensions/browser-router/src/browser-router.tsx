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
} from "@raycast/api";
import { useEffect, useState, useMemo } from "react";
import { BrowserProfile } from "./types";
import { detectAllProfiles } from "./utils/browserDetector";
import { buildTargetUrl } from "./utils/urlHelper";
import { launchBrowserProfile } from "./utils/launcher";
import { toggleFavorite, removeCustomProfile } from "./utils/storage";
import { AddCustomProfileForm } from "./components/AddCustomProfileForm";
import { RenameProfileForm } from "./components/RenameProfileForm";
import { FeedbackForm } from "./components/FeedbackForm";
import { UserManualView } from "./components/UserManualView";

export default function Command(props: LaunchProps<{ arguments: { query?: string }; fallbackText?: string }>) {
  const preferences = getPreferenceValues<Preferences>();

  // Determine if query came from Raycast argument or fallback text
  const initialQuery = (props.arguments?.query || props.fallbackText || "").trim();

  // Mode: "query" (default, typing updates search query/URL) or "filter" (typing filters browser list)
  const [mode, setMode] = useState<"query" | "filter">("query");

  // Preserved state for both modes
  const [searchQuery, setSearchQuery] = useState<string>(initialQuery);
  const [filterText, setFilterText] = useState<string>("");

  const [hasSeenManual, setHasSeenManual] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkFirstRun() {
      const seen = await LocalStorage.getItem<boolean>("hasSeenUserManual");
      setHasSeenManual(!!seen);
    }
    checkFirstRun();
  }, []);

  async function handleDismissFirstRun() {
    await LocalStorage.setItem("hasSeenUserManual", true);
    setHasSeenManual(true);
  }

  const [profiles, setProfiles] = useState<BrowserProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  async function loadProfiles() {
    setIsLoading(true);
    try {
      const detected = await detectAllProfiles();
      setProfiles(detected);
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
    await launchBrowserProfile(profile, targetUrl || undefined, incognito);
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

  // Filter profiles when in "filter" mode, or show all when in "query" mode
  const displayedProfiles = useMemo(() => {
    if (mode !== "filter" || !filterText.trim()) {
      return profiles;
    }
    const q = filterText.toLowerCase().trim();
    return profiles.filter((p) => {
      const matchDisplay = p.displayName.toLowerCase().includes(q);
      const matchBrowser = p.browserName.toLowerCase().includes(q);
      const matchProfile = p.profileName.toLowerCase().includes(q);
      const matchDir = p.profileDirectory.toLowerCase().includes(q);
      const matchEmail = p.email ? p.email.toLowerCase().includes(q) : false;
      return matchDisplay || matchBrowser || matchProfile || matchDir || matchEmail;
    });
  }, [profiles, mode, filterText]);

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
    const accessories: List.Item.Accessory[] = [
      {
        text: `Profile: ${profile.profileDirectory}`,
      },
    ];

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
                title="Rename Display Name…"
                icon={Icon.Pencil}
                shortcut={Keyboard.Shortcut.Common.Edit}
                target={<RenameProfileForm profile={profile} onRenamed={loadProfiles} />}
              />
              <Action.Push
                title="Add Custom Profile…"
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
              title="Add Custom Profile…"
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

      {favorites.length > 0 ? <List.Section title="Favorites">{favorites.map(renderProfileItem)}</List.Section> : null}

      <List.Section title={sectionTitle}>{allOther.map(renderProfileItem)}</List.Section>
    </List>
  );
}
