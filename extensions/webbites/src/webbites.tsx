import React from "react";
import {
  ActionPanel,
  Action,
  Icon,
  Grid,
  Detail,
  LocalStorage,
  List,
} from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import LoginView from "./components/LoginView";
import {
  isLoggedIn,
  logout,
  // getCurrentUser,
  initializeParse,
} from "./utils/auth";
import { search } from "./utils/search";
import { getSimpleCurrentUser } from "./utils/userHelpers";

export default function Command() {
  const [columns, setColumns] = useState(3);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Define proper types instead of using 'any'
  // interface User {
  //   id: string;
  //   username: string;
  //   email: string;
  // }

  interface BookmarkItem {
    objectId: string;
    siteTitle: string;
    url: string;
    description?: string;
    siteScreenshot?: { url: string };
    OGImage?: string;
    siteLogo?: string;
    type?: string;
    title?: string;
  }

  // const [user, setUser] = useState<User | null>(null);
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<BookmarkItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  // Remove setters from state variables that aren't modified after initialization
  const [hitsPerPage] = useState(40);
  const [orderBy] = useState("newFirst");
  const [hasMoreResults, setHasMoreResults] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const isInitialized = useRef(false);
  // Add this to keep previous results while searching
  const previousResults = useRef<BookmarkItem[]>([]);

  // Initialize app when component mounts
  useEffect(() => {
    // Prevent duplicate initialization
    if (isInitialized.current) return;
    isInitialized.current = true;

    const initialize = async () => {
      // console.log("Initializing WebBites...");

      try {
        initializeParse();

        // Load cached results from LocalStorage first
        const cachedResults = await LocalStorage.getItem<string>(
          "webbites_cached_results",
        );
        if (cachedResults) {
          try {
            const parsedResults = JSON.parse(cachedResults) as BookmarkItem[];
            setSearchResults(parsedResults);
            console.log("Loaded cached results:", parsedResults.length);
          } catch (e) {
            console.error("Error parsing cached results:", e);
          }
        }

        await checkAuthStatus();
      } catch (error) {
        console.error("Initialization error:", error);
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  // Modified useEffect to handle search
  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      // Reset pagination when search text changes
      setCurrentPage(0);
      // Don't clear search results here, just start searching
      setHasMoreResults(true);
      handleSearch();
    }, 400);

    return () => clearTimeout(debounceTimeout);
  }, [searchText]);

  const checkAuthStatus = async () => {
    setIsLoading(true);
    // console.log("Checking authentication status...");

    try {
      // First check if we have a valid session
      const authenticated = await isLoggedIn();
      setIsAuthenticated(authenticated);

      return true;
    } catch (error) {
      console.error("Error checking auth status:", error);
      setIsAuthenticated(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoggedIn = async () => {
    try {
      console.log("User logged in, updating state...");
      const results = await search({
        searchTerm: "",
        orderBy: "newFirst", // or whatever default sorting you want
        page: 0,
        hitsPerPage: hitsPerPage,
      });
      // Remove duplicate items based on objectId
      const uniqueResults =
        results.hits?.filter(
          (hit, index, self) =>
            index === self.findIndex((h) => h.objectId === hit.objectId),
        ) || [];
      setSearchResults(uniqueResults || []);
      setHasMoreResults(uniqueResults?.length === hitsPerPage);

      // Cache the results to LocalStorage
      if (uniqueResults.length > 0) {
        await LocalStorage.setItem(
          "webbites_cached_results",
          JSON.stringify(uniqueResults),
        );
        console.log("Cached", uniqueResults.length, "results to LocalStorage");
      }
    } catch (error) {
      console.log("Error during log in search:", error);
    }
  };

  const handleLoginSuccess = async () => {
    console.log("Login successful, updating state...");
    await checkAuthStatus();
    await handleLoggedIn();
  };

  const handleLogout = async () => {
    setIsLoading(true);
    console.log("Logging out...");

    try {
      await logout();
      setIsAuthenticated(false);
      console.log("Logout complete");

      // Clear cached results when logging out
      await LocalStorage.removeItem("webbites_cached_results");

      // Verify LocalStorage is cleared
      const sessionToken = await LocalStorage.getItem("webbites_session_token");
      console.log("Session token after logout:", sessionToken);
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Add this new ref to track search timing
  const searchTimer = useRef<NodeJS.Timeout | null>(null);

  const handleSearch = async (text?: string, page: number = 0) => {
    const searchTerm = text !== undefined ? text : searchText;

    const user = await getSimpleCurrentUser();

    if (isSearching || !user) return;

    // Clear any existing timer
    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
    }

    // Start searching immediately
    setIsSearching(true);

    // Store current results before replacing them
    if (page === 1) {
      previousResults.current = searchResults;
    }

    // console.log(`Searching for: ${searchTerm}, page: ${page}`);

    try {
      const results = await search({
        searchTerm,
        orderBy: orderBy,
        page: page,
        hitsPerPage: hitsPerPage,
      });

      if (page === 0) {
        setSearchResults(results.hits || []);
      } else {
        setSearchResults((prevResults) => [
          ...prevResults,
          ...(results.hits || []),
        ]);
      }

      setHasMoreResults(results.hits?.length === hitsPerPage);
      // console.log(`Found ${results.hits?.length || 0} results for page ${page}`);
    } catch (error) {
      console.error("Search error 1:", error);

      // If first page search fails, restore previous results
      if (page === 0) {
        setSearchResults(previousResults.current);
      }
    } finally {
      // Clear the timer and set searching to false
      if (searchTimer.current) {
        clearTimeout(searchTimer.current);
      }
      setIsSearching(false);
    }
  };

  const loadMoreResults = async () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    await handleSearch(searchText, nextPage);
  };

  // Show login view if not authenticated
  if (isAuthenticated === false) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  // Show loading screen while checking authentication
  if (isLoading || isAuthenticated === null) {
    return <Detail markdown="Loading WebBites..." />;
  }

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

  const getFaviconForList = (result: BookmarkItem) => {
    if (result.siteLogo) {
      return result.siteLogo;
    }
    return { source: Icon.Globe };
  };

  const renderEmptyGridView = () => {
    // Only show "no results" when not searching and actually have no results
    let title =
      searchText && !isSearching
        ? "No results found for your search"
        : "No bookmarks found";
    let description =
      searchText && !isSearching
        ? "Try a different search term"
        : "Add some bookmarks to get started";

    if (isLoading || isAuthenticated === null || isSearching) {
      title = "Loading WebBites...";
      description = "Please wait...";
    }

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
    // Only show "no results" when not searching and actually have no results
    let title =
      searchText && !isSearching
        ? "No results found for your search"
        : "No bookmarks found";
    let description =
      searchText && !isSearching
        ? "Try a different search term"
        : "Add some bookmarks to get started";

    if (isLoading || isSearching || isAuthenticated === null) {
      title = "Loading WebBites...";
      description = "Please wait...";
    }

    return (
      <List.EmptyView
        title={title}
        description={description}
        icon={{ source: "webbites-logo-medium.png" }}
        actions={getCommonActions()}
      />
    );
  };

  // Render function for grid items
  const renderGridItems = () => {
    // If we have results and we're not actively searching, show them
    if (searchResults.length > 0 && !isSearching) {
      return searchResults.map((result, index) => (
        <Grid.Item
          key={result.objectId || index}
          content={{
            value: {
              source: getBookmarkImage(result),
            },
            tooltip: result.title || "Bookmark",
          }}
          title={result.siteTitle || "Untitled Bookmark"}
          actions={getCommonActions(result)}
        />
      ));
    }

    // Keep showing old results while searching if we have them
    if (isSearching && searchResults.length > 0) {
      return searchResults.map((result, index) => (
        <Grid.Item
          key={result.objectId || index}
          content={{
            value: {
              source: getBookmarkImage(result),
            },
            tooltip: result.title || "Bookmark",
          }}
          title={result.siteTitle || "Untitled Bookmark"}
          actions={getCommonActions(result)}
        />
      ));
    }

    // Only show empty view when we're truly empty (not during search transitions)
    return renderEmptyGridView();
  };

  // Common actions for both grid and list views
  const getCommonActions = (result?: BookmarkItem) =>
    result ? (
      <ActionPanel>
        <ActionPanel.Section>
          <Action.OpenInBrowser url={result.url} />
          <Action.CopyToClipboard content={result.url} title="Copy URL" />
          <Action.OpenInBrowser
            url={`https://www.webbites.io/app?bookmarkId=${result.objectId}`}
            icon={{ source: "webbites-extension-icon.png" }}
            title="View on WebBites"
          />
        </ActionPanel.Section>

        <ActionPanel.Section>
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
          <Action
            icon={{ source: Icon.Logout }}
            title="Logout"
            onAction={handleLogout}
          />
        </ActionPanel.Section>
      </ActionPanel>
    );

  // Render List view
  if (viewMode === "list") {
    return (
      <List
        isLoading={isLoading || isSearching}
        searchText={searchText}
        pagination={{
          onLoadMore: loadMoreResults,
          hasMore: hasMoreResults,
          pageSize: hitsPerPage,
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
      >
        {/* Keep showing previous results while searching */}
        {searchResults.length === 0
          ? renderEmptyListView()
          : searchResults.map((result, index) => (
              <List.Item
                key={result.objectId || index}
                title={result.siteTitle || "Untitled Bookmark"}
                subtitle={result.url}
                icon={getFaviconForList(result)}
                accessories={[{ text: result.description || "" }]}
                actions={getCommonActions(result)}
              />
            ))}
      </List>
    );
  }

  // Show Grid view (default)
  return (
    <Grid
      columns={columns}
      inset={Grid.Inset.Zero}
      aspectRatio={"16/9"}
      fit={Grid.Fit.Fill}
      isLoading={isLoading} // Only show loading on initial load, not during search
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search your WebBites..."
      pagination={{
        onLoadMore: loadMoreResults,
        hasMore: hasMoreResults,
        pageSize: hitsPerPage,
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
            {/* <Grid.Dropdown.Item title="Large" value="3" icon={Icon.Circle} />
            <Grid.Dropdown.Item title="Medium" value="5" icon={Icon.Circle} />
            <Grid.Dropdown.Item title="Small" value="8" icon={Icon.Circle} /> */}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {renderGridItems()}
    </Grid>
  );
}
