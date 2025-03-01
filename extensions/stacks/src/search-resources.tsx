import { useState, useEffect } from "react";
import { ActionPanel, Action, Icon, Grid, Color, showToast, Toast, Cache } from "@raycast/api";
import { executeQuery, getApiToken } from "./utils/graphql";
import Welcome from "./components/Welcome";
import TokenManagement from "./components/TokenManagement";

// GraphQL query to fetch resources (links)
const FETCH_RESOURCES_QUERY = `
  query Links($page: Int!, $perPage: Int!, $query: String) {
    links(page: $page, perPage: $perPage, query: $query) {
      created_at
      description
      domain
      favicon_url
      id
      image_url
      is_quick_note
      is_uploaded_file
      is_user_page
      latitude
      link_content
      link_type
      longitude
      notes
      price
      read_time
      screenshot_url
      sharing_preference
      stacks
      summary
      tags
      target_url
      title
      updated_at
    }
  }
`;

// Initialize cache
const resourceCache = new Cache({
  namespace: "stacks-resources-grid",
});

// Define the Link type from the API
interface LinkData {
  id: string;
  title?: string;
  target_url: string;
  image_url?: string;
  screenshot_url?: string;
  link_type?: string;
  domain?: string;
  favicon_url?: string;
  description?: string;
  summary?: string;
  created_at?: string;
  updated_at?: string;
}

interface Resource {
  id: string;
  title: string;
  url: string;
  thumbnail?: string;
  type: string;
  domain?: string;
  favicon_url?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  target_url: string;
}

// Function to get icon based on resource type
function getIconForResourceType(type: string) {
  switch (type.toLowerCase()) {
    case "link":
      return Icon.Link;
    case "image":
      return Icon.Image;
    case "document":
      return Icon.Document;
    case "video":
      return Icon.Video;
    case "note":
    case "quick_note":
      return Icon.TextDocument;
    case "file":
    case "uploaded_file":
      return Icon.Document;
    default:
      return Icon.Bookmark;
  }
}

// Grid View Command
export default function Command() {
  // Use the stored column value or default to 2
  const [columns, setColumns] = useState(2);
  const [isLoading, setIsLoading] = useState(true);
  // Initialize with empty array to prevent null rendering issues
  const [resources, setResources] = useState<Resource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const perPage = 50; // Number of items per page
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  // Add a state to track initial load vs subsequent loads
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Check if token exists
  useEffect(() => {
    async function checkToken() {
      try {
        const token = await getApiToken();
        setHasToken(!!token);
      } catch (error) {
        setHasToken(false);
      }
    }

    checkToken();
  }, []);

  // Only fetch resources if we have a token
  useEffect(() => {
    if (hasToken === true) {
      fetchResources();
    } else if (hasToken === false) {
      setIsLoading(false);
    }
  }, [hasToken]);

  async function fetchResources(loadMore = false, forceRefresh = false) {
    try {
      if (!loadMore) {
        // Only show loading indicator on initial load or forced refresh
        if (!initialLoadComplete || forceRefresh) {
          setIsLoading(true);
        }
        // Reset to page 1 for new searches
        setPage(1);
      }

      // Get current page from state
      const currentPage = loadMore ? page + 1 : 1;

      // Create cache key based on query parameters
      const cacheKey = `${searchText || "all"}-page${currentPage}-perPage${perPage}`;

      // Try to get from cache first (skip cache if forceRefresh is true)
      let data: { links: LinkData[] };
      const cachedData = forceRefresh ? null : resourceCache.get(cacheKey);

      if (cachedData) {
        data = JSON.parse(cachedData);
      } else {
        // Fetch from API
        data = await executeQuery<{ links: LinkData[] }>(FETCH_RESOURCES_QUERY, {
          page: currentPage,
          perPage: perPage,
          query: searchText.trim() || undefined,
        });

        // Save to cache
        resourceCache.set(cacheKey, JSON.stringify(data));
      }

      // Transform the links data to match our Resource interface
      const transformedResources = data.links.map((link) => ({
        id: link.id,
        title: link.title || "Untitled",
        url: link.target_url,
        target_url: link.target_url,
        thumbnail: link.image_url || link.screenshot_url,
        type: link.link_type || "link",
        domain: link.domain,
        favicon_url: link.favicon_url,
        description: link.description || link.summary,
        created_at: link.created_at,
        updated_at: link.updated_at,
      }));

      // If we're loading more, append to existing resources
      if (loadMore) {
        setResources((prevResources) => [...prevResources, ...transformedResources]);
        // Update page only when loading more
        setPage(currentPage);
      } else {
        setResources(transformedResources);
      }

      // Mark initial load as complete
      if (!initialLoadComplete) {
        setInitialLoadComplete(true);
      }

      // Update hasMore flag
      setHasMore(transformedResources.length >= perPage);
    } catch (error) {
      // Check if the error is related to authentication/token
      const errorMsg = error instanceof Error ? error.message : String(error);
      const isAuthError =
        errorMsg.toLowerCase().includes("unauthorized") ||
        errorMsg.toLowerCase().includes("authentication") ||
        errorMsg.toLowerCase().includes("token") ||
        errorMsg.toLowerCase().includes("access denied") ||
        errorMsg.toLowerCase().includes("permission");

      if (isAuthError) {
        setError("Authentication error: Your API token may be invalid or expired");

        await showToast({
          style: Toast.Style.Failure,
          title: "Authentication Error",
          message: "Please check your API token in settings",
          primaryAction: {
            title: "Manage Token",
            onAction: () => {
              // We can't directly push to TokenManagement here,
              // but we'll let the user know to use the action
            },
          },
        });
      } else {
        setError(`Error fetching resources: ${errorMsg}`);

        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch resources",
          message: errorMsg,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  // Function to handle refresh action
  async function handleRefresh() {
    await showToast({
      style: Toast.Style.Animated,
      title: "Refreshing resources",
    });

    await fetchResources(false, true);

    await showToast({
      style: Toast.Style.Success,
      title: "Resources refreshed",
    });
  }

  // Set up search state
  const [searchText, setSearchText] = useState("");

  // Reset and fetch when search text changes
  useEffect(() => {
    // Only fetch if we have a token
    if (hasToken) {
      // Use a slight delay to avoid visual jitter when typing quickly
      const debounceTimeout = setTimeout(() => {
        fetchResources(false);
      }, 300);

      return () => clearTimeout(debounceTimeout);
    }
  }, [searchText, hasToken]);

  // Show welcome screen if no token is set
  if (hasToken === false) {
    return <Welcome onComplete={() => setHasToken(true)} />;
  }

  return (
    <Grid
      columns={columns}
      aspectRatio="16/9"
      fit={Grid.Fit.Fill}
      inset={Grid.Inset.Zero}
      isLoading={isLoading}
      searchBarPlaceholder="Search your resources..."
      onSearchTextChange={setSearchText}
      pagination={{
        onLoadMore: () => fetchResources(true),
        hasMore: hasMore,
        pageSize: perPage,
      }}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Grid Size"
          storeValue
          onChange={(newValue) => {
            setColumns(parseInt(newValue));
          }}
        >
          <Grid.Dropdown.Section title="Grid Size">
            <Grid.Dropdown.Item title="Large" value="2" />
            <Grid.Dropdown.Item title="Medium" value="3" />
            <Grid.Dropdown.Item title="Small" value="4" />
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {resources.length > 0 ? (
        resources.map((resource, index) => (
          <Grid.Item
            key={`${resource.id}-${index}`}
            content={{
              source: resource.thumbnail || getIconForResourceType(resource.type),
              fallback: getIconForResourceType(resource.type),
              tintColor: !resource.thumbnail ? Color.PrimaryText : undefined,
            }}
            title={resource.title}
            subtitle={resource.domain || resource.url}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.OpenInBrowser url={resource.target_url} title="Open in Browser" icon={Icon.Globe} />
                  <Action.CopyToClipboard content={resource.target_url} title="Copy URL" icon={Icon.Clipboard} />
                  {resource.description && (
                    <Action.CopyToClipboard content={resource.description} title="Copy Description" icon={Icon.Text} />
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={handleRefresh}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.Push title="Manage Api Token" icon={Icon.Key} target={<TokenManagement />} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      ) : (
        <Grid.EmptyView
          title={error || (searchText ? `No Results for "${searchText}"` : "No Resources Found")}
          description={
            error
              ? "Please try again or check your connection"
              : searchText
                ? "Try different search terms or clear the search"
                : "Start saving resources to see them here"
          }
          icon={error ? Icon.ExclamationMark : searchText ? Icon.MagnifyingGlass : Icon.Bookmark}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={handleRefresh}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action.Push title="Manage Api Token" icon={Icon.Key} target={<TokenManagement />} />
            </ActionPanel>
          }
        />
      )}
    </Grid>
  );
}
