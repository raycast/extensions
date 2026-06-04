import {
  Grid,
  Detail,
  ActionPanel,
  Action,
  getPreferenceValues,
  Icon,
  openExtensionPreferences,
  LocalStorage,
  Color,
} from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import { useUsers, usePinnedUsers, useLocationStats, useUser, SearchMode } from "./hooks";
import { User } from "./lib/types";

const PINNED_USERS_KEY = "pinned-users";
const PINNED_USERS_CACHE_KEY = "pinned-users-cache";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("login");
  const [pinnedUserLogins, setPinnedUserLogins] = useState<string[]>([]);
  const [pinnedUsersCache, setPinnedUsersCache] = useState<Record<string, User>>({});
  const [isLoadingPinned, setIsLoadingPinned] = useState(true);

  const preferences = getPreferenceValues<Preferences>();
  const debugMode = preferences.debugMode || false;

  // Load pinned users and cache from LocalStorage
  useEffect(() => {
    async function loadPinnedUsers() {
      try {
        const stored = await LocalStorage.getItem<string>(PINNED_USERS_KEY);
        if (stored) {
          setPinnedUserLogins(JSON.parse(stored));
        }

        const cachedData = await LocalStorage.getItem<string>(PINNED_USERS_CACHE_KEY);
        if (cachedData) {
          setPinnedUsersCache(JSON.parse(cachedData));
        }
      } catch (error) {
        if (debugMode) {
          console.error("Failed to load pinned users:", error);
        }
      } finally {
        setIsLoadingPinned(false);
      }
    }
    loadPinnedUsers();
  }, []);

  // Save pinned users to LocalStorage
  async function savePinnedUsers(logins: string[]) {
    try {
      await LocalStorage.setItem(PINNED_USERS_KEY, JSON.stringify(logins));
      setPinnedUserLogins(logins);
    } catch (error) {
      if (debugMode) {
        console.error("Failed to save pinned users:", error);
      }
    }
  }

  // Cache a user's data
  async function cacheUser(user: User) {
    try {
      const newCache = { ...pinnedUsersCache, [user.login]: user };
      await LocalStorage.setItem(PINNED_USERS_CACHE_KEY, JSON.stringify(newCache));
      setPinnedUsersCache(newCache);
    } catch (error) {
      if (debugMode) {
        console.error("Failed to cache user:", error);
      }
    }
  }

  // Remove user from cache
  async function removeCachedUser(login: string) {
    try {
      const newCache = { ...pinnedUsersCache };
      delete newCache[login];
      await LocalStorage.setItem(PINNED_USERS_CACHE_KEY, JSON.stringify(newCache));
      setPinnedUsersCache(newCache);
    } catch (error) {
      if (debugMode) {
        console.error("Failed to remove cached user:", error);
      }
    }
  }

  const { users, isLoading, error, isAuthenticated, isAuthenticating, authenticate } = useUsers(searchText, {
    execute: searchText.length > 0,
    searchMode,
  });

  // Fetch pinned users only if not in cache
  const uncachedLogins = useMemo(() => {
    return pinnedUserLogins.filter((login) => !pinnedUsersCache[login]);
  }, [pinnedUserLogins, pinnedUsersCache]);

  const { users: fetchedPinnedUsers, isLoading: isLoadingPinnedUsers } = usePinnedUsers(uncachedLogins, {
    execute: searchText.length === 0 && uncachedLogins.length > 0,
  });

  // Update cache when new pinned users are fetched
  useEffect(() => {
    if (fetchedPinnedUsers && fetchedPinnedUsers.length > 0) {
      fetchedPinnedUsers.forEach((user) => {
        if (!pinnedUsersCache[user.login]) {
          cacheUser(user);
        }
      });
    }
  }, [fetchedPinnedUsers]);

  // Combine cached and fetched pinned users
  const pinnedUsers = useMemo(() => {
    const cached = pinnedUserLogins.map((login) => pinnedUsersCache[login]).filter(Boolean);
    return cached;
  }, [pinnedUserLogins, pinnedUsersCache]);

  // Determine which users to display
  const displayUsers = useMemo(() => {
    if (searchText.length > 0) {
      return users || [];
    }
    return pinnedUsers;
  }, [searchText, users, pinnedUsers]);

  // Log errors in debug mode
  if (debugMode && error) {
    console.error("API Error:", error);
  }

  function togglePin(user: User) {
    const isCurrentlyPinned = pinnedUserLogins.includes(user.login);

    if (isCurrentlyPinned) {
      // Unpinning: remove from list and cache
      const newPinned = pinnedUserLogins.filter((l) => l !== user.login);
      savePinnedUsers(newPinned);
      removeCachedUser(user.login);
    } else {
      // Pinning: add to list and cache the user data
      const newPinned = [...pinnedUserLogins, user.login];
      savePinnedUsers(newPinned);
      cacheUser(user);
    }
  }

  function isPinned(login: string): boolean {
    return pinnedUserLogins.includes(login);
  }

  function getErrorDetails() {
    if (!error) return null;

    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    if (errorMessage.includes("unauthorized") || errorMessage.includes("Unauthorized")) {
      return {
        title: "Authentication Error",
        description: "Your access token may be invalid or expired. Please re-authenticate.",
        actions: (
          <ActionPanel>
            <Action title="Re-authenticate" onAction={authenticate} icon={Icon.Lock} />
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} icon={Icon.Gear} />
          </ActionPanel>
        ),
      };
    }

    return {
      title: "Error",
      description: errorMessage,
      actions: (
        <ActionPanel>
          <Action title="Try Again" onAction={() => setSearchText("")} icon={Icon.RotateClockwise} />
        </ActionPanel>
      ),
    };
  }

  const isLoadingState = isLoading || isAuthenticating || isLoadingPinned || isLoadingPinnedUsers;

  return (
    <Grid
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={
        searchMode === "login"
          ? "Search users by login (prefix)..."
          : searchMode === "first_name"
            ? "Search users by first name (exact)..."
            : "Search users by last name (exact)..."
      }
      throttle
      isLoading={isLoadingState}
      columns={5}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Search Mode"
          value={searchMode}
          onChange={(value) => setSearchMode(value as SearchMode)}
        >
          <Grid.Dropdown.Item title="Login (Prefix)" value="login" icon={Icon.AtSymbol} />
          <Grid.Dropdown.Item title="First Name (Exact)" value="first_name" icon={Icon.Person} />
          <Grid.Dropdown.Item title="Last Name (Exact)" value="last_name" icon={Icon.TwoPeople} />
        </Grid.Dropdown>
      }
    >
      {isAuthenticating ? (
        <Grid.EmptyView
          title="Authenticating..."
          description="Please complete the OAuth flow to continue"
          icon={Icon.Lock}
        />
      ) : !isAuthenticated ? (
        <Grid.EmptyView
          title="Authentication Required"
          description="Please complete the OAuth flow to use this extension"
          icon={Icon.Lock}
          actions={
            <ActionPanel>
              <Action title="Authenticate" onAction={authenticate} icon={Icon.Lock} />
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} icon={Icon.Gear} />
            </ActionPanel>
          }
        />
      ) : isLoadingState ? (
        <Grid.EmptyView title="Loading..." description="Please wait..." />
      ) : error ? (
        <Grid.EmptyView
          title={getErrorDetails()?.title || "Error"}
          description={getErrorDetails()?.description || "An unknown error occurred"}
          icon={Icon.ExclamationMark}
          actions={getErrorDetails()?.actions}
        />
      ) : searchText.length === 0 && pinnedUserLogins.length === 0 ? (
        <Grid.EmptyView
          title="No Pinned Users"
          description="Search for users or pin your favorites to see them here"
          icon={Icon.Star}
        />
      ) : displayUsers.length === 0 ? (
        <Grid.EmptyView title="No Users Found" description="Try a different search term" icon={Icon.MagnifyingGlass} />
      ) : (
        <Grid.Section title={searchText ? "Search Results" : "Pinned Users"}>
          {displayUsers.map((user) => (
            <Grid.Item
              key={user.id}
              content={user.image.versions?.medium || user.image.link}
              title={user.login}
              subtitle={user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : undefined}
              accessory={
                isPinned(user.login)
                  ? { icon: Icon.Star, tooltip: "Pinned" }
                  : { icon: user.location ? Icon.Pin : Icon.Logout, tooltip: user.location || "Offline" }
              }
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Details"
                    icon={Icon.Eye}
                    target={
                      <UserDetail
                        user={user}
                        isPinned={isPinned(user.login)}
                        onTogglePin={togglePin}
                        onUserUpdate={cacheUser}
                      />
                    }
                  />
                  <Action.OpenInBrowser
                    url={`https://profile.intra.42.fr/users/${user.login}`}
                    title="Open Profile"
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                  <Action
                    title={isPinned(user.login) ? "Unpin User" : "Pin User"}
                    icon={isPinned(user.login) ? Icon.StarDisabled : Icon.Star}
                    onAction={() => togglePin(user)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </Grid.Section>
      )}
    </Grid>
  );
}

interface UserDetailProps {
  user: User;
  isPinned: boolean;
  onTogglePin: (user: User) => void;
  onUserUpdate?: (user: User) => void;
}

function UserDetail({ user, isPinned: initialIsPinned, onTogglePin, onUserUpdate }: UserDetailProps) {
  const [isPinned, setIsPinned] = useState(initialIsPinned);

  // Fetch latest user data for pinned users to ensure location and evaluation points are up-to-date
  const {
    user: latestUser,
    isLoading: isLoadingUser,
    revalidate: revalidateUser,
  } = useUser(user.login, {
    execute: isPinned,
  });

  // Today's date range for logtime
  const today = new Date();
  const beginAt = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endAt = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  const {
    stats,
    isLoading: isLoadingStats,
    revalidate: revalidateStats,
  } = useLocationStats(user.id, {
    dateRange: { beginAt, endAt },
    execute: true,
  });

  // Update parent cache when fresh data is fetched
  useEffect(() => {
    if (latestUser && isPinned && onUserUpdate) {
      onUserUpdate(latestUser);
    }
  }, [latestUser, isPinned]);

  const displayUser = isPinned && latestUser ? latestUser : user;
  const isLoading = isLoadingStats || (isPinned && isLoadingUser);

  // Calculate today's logtime
  const todayLogtime = useMemo(() => {
    if (!stats) return "N/A";
    const todayKey = today.toISOString().split("T")[0];
    const timeString = stats[todayKey];
    if (!timeString) return "0h 0m";

    // Parse time string (format: "HH:MM:SS.microseconds")
    const parts = timeString.split(":");
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);

    return `${hours}h ${minutes}m`;
  }, [stats]);

  const handleTogglePin = () => {
    onTogglePin(user);
    setIsPinned(!isPinned);
  };

  const handleRefresh = async () => {
    // Refresh both user data and location stats
    await Promise.all([isPinned ? revalidateUser() : Promise.resolve(), revalidateStats()]);
  };

  // Build markdown content
  const markdown = `
![Profile Picture](${displayUser.image.versions?.medium || displayUser.image.link})
`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={displayUser.login}
      metadata={
        <Detail.Metadata>
          {isPinned && (
            <Detail.Metadata.TagList title="">
              <Detail.Metadata.TagList.Item text={"Pinned"} color={"#FFD700"} />
            </Detail.Metadata.TagList>
          )}
          {displayUser.first_name && displayUser.last_name && (
            <Detail.Metadata.Label
              title="Full Name"
              text={`${displayUser.first_name} ${displayUser.last_name} (${displayUser.login})`}
            />
          )}
          <Detail.Metadata.Label
            title="Location"
            text={{
              value: displayUser.location || "Offline",
              color: displayUser.location ? Color.Green : Color.PrimaryText,
            }}
            icon={displayUser.location ? Icon.Pin : Icon.Logout}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Logtime Today" text={todayLogtime} icon={Icon.Clock} />
          {displayUser.correction_point !== undefined && (
            <Detail.Metadata.Label
              title="Evaluation Points"
              text={displayUser.correction_point.toString()}
              icon={Icon.Coins}
            />
          )}
          <Detail.Metadata.Separator />
          {displayUser.pool_year && displayUser.pool_month && (
            <Detail.Metadata.Label
              title="Pool"
              text={`${displayUser.pool_month} ${displayUser.pool_year}`}
              icon={Icon.Calendar}
            />
          )}
          <Detail.Metadata.Separator />
          {displayUser.email && <Detail.Metadata.Label title="Email" text={displayUser.email} />}
          <Detail.Metadata.Separator />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            url={`https://profile.intra.42.fr/users/${displayUser.login}`}
            title="Open Profile"
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          <Action
            title="Refresh Profile"
            icon={Icon.RotateClockwise}
            onAction={handleRefresh}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action
            title={isPinned ? "Unpin User" : "Pin User"}
            icon={isPinned ? Icon.StarDisabled : Icon.Star}
            onAction={handleTogglePin}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          />
        </ActionPanel>
      }
    />
  );
}
