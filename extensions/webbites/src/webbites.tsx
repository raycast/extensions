// webbites.tsx - Refactored

import React, { useState, useEffect, useRef } from "react";
import {
  ActionPanel,
  Action,
  Icon,
  Grid,
  Detail,
  LocalStorage,
  List,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, getFavicon } from "@raycast/utils";
import { isLoggedIn, logout, login } from "./utils/auth";
import { search } from "./utils/search";
import { getSimpleCurrentUser, clearUserData } from "./utils/userHelpers";
import { saveTabToQstash, isValidUrl } from "./utils/qstash";
import { BookmarkItem } from "./types";
import { plausible } from "./utils/plausible";

// Constants
const HITS_PER_PAGE = 40;
const CACHED_RESULTS_KEY = "webbites_cached_results";
const SESSION_TOKEN_KEY = "webbites_session_token";

// Content type icons mapping
const CONTENT_TYPE_ICONS = {
  textNote: Icon.Pencil,
  image: Icon.Image,
  game: Icon.GameController,
  movie: Icon.FilmStrip,
  music: Icon.Music,
  website: Icon.Link,
} as const;

// Type emoji mapping
const TYPE_EMOJI = {
  image: "🏞️ ",
  game: "🎮 ",
  movie: "🎬 ",
  music: "🎵 ",
  textNote: "📝 ",
};

const noResultsMessage = (searchText: string) => {
  return `No results found for "${searchText}"`;
};

const noBookmarksMessage = "No bookmarks found";

export default function Command() {
  // State
  const [columns, setColumns] = useState(3);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<BookmarkItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMoreResults, setHasMoreResults] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Refs
  const isInitialized = useRef(false);
  const previousResults = useRef<BookmarkItem[]>([]);
  const searchTimer = useRef<NodeJS.Timeout | null>(null);

  // Initialize app
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    initializeApp();
  }, []);

  const initializeApp = async () => {
    setIsLoading(true);
    try {
      // Load cached results first for faster initial rendering
      await loadCachedResults();

      // Handle authentication
      const authenticated = await checkAuthStatus();

      // If not authenticated, try to log in with credentials from preferences
      if (!authenticated) {
        await tryAutoLogin();
      }

      // Track extension open
      const user = await getSimpleCurrentUser();
      if (user) {
        await plausible.trackExtensionOpen(user.id);
      }
    } catch (error) {
      console.error("Initialization error:", error);
      setIsAuthenticated(false);
      showFailureToast(error, {
        title: "Error initializing WebBites, try again",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadCachedResults = async () => {
    try {
      const cachedResults =
        await LocalStorage.getItem<string>(CACHED_RESULTS_KEY);
      const sessionToken =
        await LocalStorage.getItem<string>(SESSION_TOKEN_KEY);
      if (cachedResults && sessionToken) {
        const parsedResults = JSON.parse(cachedResults) as BookmarkItem[];
        setSearchResults(parsedResults);
        setIsLoading(false);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error("Error loading cached results:", error);
    }
  };

  const checkAuthStatus = async (): Promise<boolean> => {
    try {
      const authenticated = await isLoggedIn();
      setIsAuthenticated(authenticated);
      return authenticated;
    } catch (error) {
      console.error("Error checking auth status:", error);
      setIsAuthenticated(false);
      setSearchResults([]);
      return false;
    }
  };

  const tryAutoLogin = async () => {
    try {
      const preferences = getPreferenceValues<{
        email: string;
        password: string;
      }>();

      if (preferences.email && preferences.password) {
        await login(preferences.email, preferences.password);
        await handleLoggedIn();
        await checkAuthStatus(); // Refresh auth state after login
      }
    } catch (error) {
      console.error("Auto-login error 1:", error);
      setSearchResults([]);
      setIsAuthenticated(false);
    }
  };

  // Handle search when searchText changes
  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      // Reset pagination when search text changes
      setCurrentPage(0);
      setHasMoreResults(true);
      handleSearch();
    }, 400);

    return () => clearTimeout(debounceTimeout);
  }, [searchText]);

  // Show preferences if not authenticated
  useEffect(() => {
    if (isAuthenticated === false) {
      // const error = new Error("User not authenticated");
      // showFailureToast(error, { title: "Login required" });
    }
  }, [isAuthenticated]);

  const handleLoggedIn = async () => {
    try {
      const results = await search({
        searchTerm: "",
        orderBy: "newFirst",
        page: 0,
        hitsPerPage: HITS_PER_PAGE,
      });

      // Remove duplicate items
      const uniqueResults = removeDuplicateItems(results.hits || []);
      setSearchResults(uniqueResults);
      setHasMoreResults(uniqueResults.length === HITS_PER_PAGE);

      // Cache results
      await cacheResults(uniqueResults);
    } catch (error) {
      console.error("Error during log in search:", error);
    }
  };

  const removeDuplicateItems = (items: BookmarkItem[]) => {
    return items.filter(
      (item, index, self) =>
        index === self.findIndex((i) => i.objectId === item.objectId),
    );
  };

  const cacheResults = async (results: BookmarkItem[]) => {
    if (results.length > 0) {
      await LocalStorage.setItem(CACHED_RESULTS_KEY, JSON.stringify(results));
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await logout();
      setIsAuthenticated(false);
      setSearchResults([]);
      await clearUserData();
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (text?: string, page: number = 0) => {
    const searchTerm = text !== undefined ? text : searchText;
    const user = await getSimpleCurrentUser();

    if (!user) return;
    if (isSearching) return;

    // Clear any existing timer
    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
    }

    setIsSearching(true);

    // Store current results before searching
    if (page === 0) {
      previousResults.current = searchResults;
    }

    try {
      const results = await search({
        searchTerm,
        orderBy: "newFirst",
        page,
        hitsPerPage: HITS_PER_PAGE,
      });

      // Cache empty search results
      if (searchTerm?.length === 0) {
        const uniqueResults = removeDuplicateItems(results.hits || []);
        await cacheResults(uniqueResults);
      }

      // Update results based on page
      if (page === 0) {
        setSearchResults(results.hits || []);
      } else {
        setSearchResults((prevResults) => [
          ...prevResults,
          ...(results.hits || []),
        ]);
      }

      setHasMoreResults(results.hits?.length === HITS_PER_PAGE);
    } catch (error) {
      console.error("Search error:", error);

      // Restore previous results on error
      if (page === 0) {
        setSearchResults(previousResults.current);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const loadMoreResults = async () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    await handleSearch(searchText, nextPage);
  };

  // Handle save to WebBites
  const handleSaveToWebBites = async () => {
    try {
      const user = await getSimpleCurrentUser();
      if (!user) {
        showFailureToast(new Error("User not authenticated"), {
          title: "Authentication required",
        });
        return;
      }

      // If searchText is empty, show a message asking for input
      if (!searchText.trim()) {
        showToast({
          title: "No Content to Save",
          message: "Please enter a URL or text to save to WebBites",
          style: Toast.Style.Failure,
        });
        return;
      }

      // Determine the type based on search text
      const type = isValidUrl(searchText) ? "website" : "textNote";

      // Only allow saving websites
      if (type !== "website") {
        showToast({
          title: "Invalid Content",
          message: "Only websites can be saved. Please enter a valid URL.",
          style: Toast.Style.Failure,
        });
        return;
      }

      let url = searchText;
      let title = searchText;

      // If it's a URL, ensure it has a protocol
      if (type === "website") {
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          url = `https://${url}`;
        }
        title = url; // For websites, use URL as title initially
      }

      await saveTabToQstash({
        url: url,
        title: title,
        userId: user.id,
        topic: "website-save-requests",
        siteNotes: "",
        // siteNotes: type === 'textNote' ? searchText : '',
        tags: [],
        customId: null,
      });

      // Track website save
      await plausible.trackWebsiteSave(user.id);

      showToast({
        title: "Saved to WebBites",
        message: "Successfully saved website",
        style: Toast.Style.Success,
      });

      // Refresh search results to show the new item
      await handleSearch();
    } catch (error) {
      console.error("Error saving to WebBites:", error);
      showFailureToast(error, {
        title: "Failed to save to WebBites",
      });
    }
  };

  // Helper functions for rendering
  const getBookmarkImage = (result: BookmarkItem) => {
    // Early return for most common case
    if (result.siteScreenshot?.url) return result.siteScreenshot.url;

    // Generate fallback URL only if needed
    const fallbackUrl = `https://webbites.io/gradients/gradient${Math.floor(Math.random() * 29) + 1}.jpg`;

    try {
      if (result.OGImage) {
        return result.type === "image"
          ? !result.OGImage.match(/\.[a-zA-Z0-9]+$/)
            ? `${result.OGImage.slice(0, -3)}.${result.OGImage.slice(-3)}`
            : result.OGImage
          : result.OGImage;
      }

      if (result.siteLogo) {
        return result.siteLogo;
      }

      return fallbackUrl;
    } catch {
      return fallbackUrl;
    }
  };

  const getIconType = (result: BookmarkItem) => {
    const iconSource =
      CONTENT_TYPE_ICONS[result.type as keyof typeof CONTENT_TYPE_ICONS];
    return iconSource ? { source: iconSource } : { source: Icon.Link };
  };

  const getFaviconForList = (result: BookmarkItem) => {
    // First check for content type specific icons
    const contentTypeIcon = getIconType(result);
    if (result.type && result.type !== "website") {
      return contentTypeIcon;
    }

    // For websites, use site logo or favicon
    if (result.siteLogo) {
      return result.siteLogo;
    }

    return result.url ? getFavicon(result.url) : contentTypeIcon;
  };

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      year: "2-digit",
      month: "short",
      day: "numeric",
      hour12: true,
    };
    return new Date(date).toLocaleString("en-US", options);
  };

  const removeHtml = (html: string = "") => {
    return html.replace(/<[^>]*>/g, "").trim();
  };

  const getBookmarkTitle = (result: BookmarkItem, isList = false) => {
    const title =
      result.type === "textNote"
        ? removeHtml(result.textNote || "")
        : result.siteTitle;

    if (isList) return title;

    const emoji = result.type
      ? TYPE_EMOJI[result.type as keyof typeof TYPE_EMOJI] || ""
      : "";
    return `${emoji}${title}`;
  };

  // Common actions for both grid and list views
  const getCommonActions = (result?: BookmarkItem) => {
    return result ? (
      <ActionPanel>
        <ActionPanel.Section>
          <Action.OpenInBrowser
            url={
              result.type === "textNote"
                ? `https://www.webbites.io/app?bookmarkId=${result.objectId}`
                : result.url
            }
            onOpen={async () => {
              // Track website open
              const user = await getSimpleCurrentUser();
              if (user) {
                await plausible.trackWebsiteOpen(user.id);
              }
            }}
          />
          <Action.CopyToClipboard content={result.url} title="Copy URL" />
          <Action.OpenInBrowser
            url={`https://www.webbites.io/app?bookmarkId=${result.objectId}`}
            icon={{ source: "webbites-extension-icon.png" }}
            title="View on WebBites"
          />
        </ActionPanel.Section>

        <ActionPanel.Section>
          {isAuthenticated && (
            <Action
              icon={{ source: Icon.Plus }}
              title={
                searchText.trim()
                  ? `Save "${searchText}" to WebBites`
                  : "Save to WebBites"
              }
              onAction={handleSaveToWebBites}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
          )}
          {isAuthenticated && (
            <Action
              icon={{ source: Icon.ArrowClockwise }}
              title="Refresh Data"
              onAction={() => handleSearch()}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          )}
          <Action
            icon={{ source: Icon.Gear }}
            title="Open Extension Preferences"
            onAction={openExtensionPreferences}
          />
          <Action
            icon={{ source: Icon.Logout }}
            title="Logout"
            onAction={handleLogout}
          />
        </ActionPanel.Section>
      </ActionPanel>
    ) : (
      <ActionPanel>
        <ActionPanel.Section>
          {isAuthenticated && (
            <Action
              icon={{ source: Icon.Plus }}
              title={
                searchText.trim()
                  ? `Save "${searchText}" to WebBites`
                  : "Save to WebBites"
              }
              onAction={handleSaveToWebBites}
              shortcut={{ modifiers: [], key: "s" }}
            />
          )}
          {isAuthenticated && (
            <Action
              icon={{ source: Icon.ArrowClockwise }}
              title="Refresh Data"
              onAction={() => handleSearch()}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          )}
          <Action
            icon={{ source: Icon.Gear }}
            title={isAuthenticated ? "Open Extension Preferences" : "Log in"}
            onAction={openExtensionPreferences}
          />
        </ActionPanel.Section>
      </ActionPanel>
    );
  };

  const emptyStateMessage = () => {
    let title =
      searchText && !isSearching
        ? noResultsMessage(searchText)
        : noBookmarksMessage;
    let description =
      searchText && !isSearching
        ? "Try a different search term"
        : "Add some bookmarks to get started";

    if (isLoading || isAuthenticated === null || isSearching) {
      title = "Loading WebBites...";
      description = "Please wait...";
    }

    if (isAuthenticated === false) {
      title = "Login required";
      description = "Please log in to access your bookmarks";
    }

    return { title, description };
  };
  // Empty state components
  const renderEmptyGridView = () => {
    const { title, description } = emptyStateMessage();

    return (
      <Grid.EmptyView
        title={title}
        description={description}
        icon={{ source: "webbites-logo-medium.png" }}
        actions={getCommonActions()}
      />
    );
  };

  const renderEmptyListView = () => {
    const { title, description } = emptyStateMessage();

    return (
      <List.EmptyView
        title={title}
        description={description}
        icon={{ source: "webbites-logo-medium.png" }}
        actions={getCommonActions()}
      />
    );
  };

  // Render grid items
  const renderGridItems = () => {
    if (searchResults.length > 0) {
      return searchResults.map((result, index) => (
        <Grid.Item
          key={result.objectId || index}
          content={{
            value: {
              source: getBookmarkImage(result),
            },
            tooltip:
              result.type === "textNote"
                ? removeHtml(result.textNote || "")
                : result.siteTitle,
          }}
          title={getBookmarkTitle(result)}
          actions={getCommonActions(result)}
        />
      ));
    }

    return renderEmptyGridView();
  };

  // Loading state
  if (isLoading || isAuthenticated === null) {
    return <Detail markdown="Loading WebBites..." />;
  }

  // Render List view
  if (viewMode === "list") {
    // Create actions for the empty list view
    const emptyListActions = (
      <ActionPanel>
        <ActionPanel.Section>
          {isAuthenticated && (
            <Action
              icon={{ source: Icon.Plus }}
              title={
                searchText.trim()
                  ? `Save "${searchText}" to WebBites`
                  : "Save to WebBites"
              }
              onAction={handleSaveToWebBites}
              shortcut={{ modifiers: [], key: "s" }}
            />
          )}
          {isAuthenticated && (
            <Action
              icon={{ source: Icon.ArrowClockwise }}
              title="Refresh Data"
              onAction={() => handleSearch()}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          )}
          <Action
            icon={{ source: Icon.Gear }}
            title={isAuthenticated ? "Open Extension Preferences" : "Log in"}
            onAction={openExtensionPreferences}
          />
        </ActionPanel.Section>
      </ActionPanel>
    );

    return (
      <List
        isLoading={isLoading || isSearching}
        searchText={searchText}
        pagination={{
          onLoadMore: loadMoreResults,
          hasMore: hasMoreResults,
          pageSize: HITS_PER_PAGE,
        }}
        onSearchTextChange={setSearchText}
        searchBarPlaceholder="Search your WebBites..."
        searchBarAccessory={
          <List.Dropdown
            tooltip="View Mode"
            storeValue
            onChange={(newValue) => {
              if (newValue === "grid") {
                setViewMode("grid");
              }
            }}
          >
            <List.Dropdown.Item
              title="Grid View"
              value="grid"
              icon={Icon.AppWindowGrid3x3}
            />
            <List.Dropdown.Item
              title="List View"
              value="list"
              icon={Icon.List}
            />
          </List.Dropdown>
        }
        actions={isAuthenticated ? emptyListActions : undefined}
      >
        {searchResults.length === 0
          ? renderEmptyListView()
          : searchResults.map((result, index) => (
              <List.Item
                title={getBookmarkTitle(result, true)}
                key={result.objectId || index}
                subtitle={result.url}
                icon={getFaviconForList(result)}
                accessories={[
                  { text: formatDate(result.createdAt) },
                  { icon: getIconType(result) },
                ]}
                actions={getCommonActions(result)}
              />
            ))}
      </List>
    );
  }

  // Show Grid view (default)

  // Create actions for the empty grid view
  const emptyGridActions = (
    <ActionPanel>
      <ActionPanel.Section>
        {isAuthenticated && (
          <Action
            icon={{ source: Icon.Plus }}
            title={
              searchText.trim()
                ? `Save "${searchText}" to WebBites`
                : "Save to WebBites"
            }
            onAction={handleSaveToWebBites}
          />
        )}
        {isAuthenticated && (
          <Action
            icon={{ source: Icon.ArrowClockwise }}
            title="Refresh Data"
            onAction={() => handleSearch()}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        )}
        <Action
          icon={{ source: Icon.Gear }}
          title={isAuthenticated ? "Open Extension Preferences" : "Log in"}
          onAction={openExtensionPreferences}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );

  return (
    <Grid
      columns={columns}
      inset={Grid.Inset.Zero}
      aspectRatio={"16/9"}
      fit={Grid.Fit.Fill}
      isLoading={isLoading || isSearching}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search your WebBites..."
      pagination={{
        onLoadMore: loadMoreResults,
        hasMore: hasMoreResults,
        pageSize: HITS_PER_PAGE,
      }}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="View Options"
          storeValue
          onChange={(newValue) => {
            if (newValue === "list") {
              setViewMode("list");
            } else {
              setColumns(parseInt(newValue));
            }
          }}
        >
          <Grid.Dropdown.Section title="View Mode">
            <Grid.Dropdown.Item
              title="Grid View"
              value="grid"
              icon={Icon.AppWindowGrid3x3}
            />
            <Grid.Dropdown.Item
              title="List View"
              value="list"
              icon={Icon.List}
            />
          </Grid.Dropdown.Section>
          <Grid.Dropdown.Section title="Grid Size">
            <Grid.Dropdown.Item title="Large" value="3" />
            <Grid.Dropdown.Item title="Medium" value="5" />
            <Grid.Dropdown.Item title="Small" value="8" />
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
      actions={isAuthenticated ? emptyGridActions : undefined}
    >
      {renderGridItems()}
    </Grid>
  );
}
