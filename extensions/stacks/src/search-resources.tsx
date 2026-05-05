import { useState, useEffect } from "react";
import {
  ActionPanel,
  Action,
  Icon,
  Grid,
  List,
  Color,
  showToast,
  Toast,
  Cache,
  Detail,
  openExtensionPreferences,
  Image,
  getPreferenceValues,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { executeQuery } from "./utils/graphql";

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
      user {
        email
        name
        profile_image_url
        username
      }
    }
  }
`;

// Initialize cache
const resourceCache = new Cache({
  namespace: "stacks-resources",
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
  tags?: string[];
  user?: {
    email?: string;
    name?: string;
    profile_image_url?: string;
    username?: string;
  };
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
  summary?: string;
  created_at?: string;
  updated_at?: string;
  target_url: string;
  tags?: string[];
  user?: {
    email?: string;
    name?: string;
    profile_image_url?: string;
    username?: string;
  };
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

// Format date to a more readable format
function formatDate(dateString?: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// Main Search Command
export default function Command() {
  // Get preferences
  const preferences = getPreferenceValues();
  const isGridView = preferences.viewType === "grid";

  // Shared state
  const [isLoading, setIsLoading] = useState(true);
  const [resources, setResources] = useState<Resource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Grid-specific state
  const [columns, setColumns] = useState(2);

  // Determine page size based on view type
  const perPage = isGridView ? 50 : 20;

  // Load resources on mount
  useEffect(() => {
    fetchResources();
  }, []);

  // Reset and fetch when search text changes
  useEffect(() => {
    // Use a slight delay to avoid visual jitter when typing quickly
    const debounceTimeout = setTimeout(() => {
      fetchResources(false);
    }, 300);

    return () => clearTimeout(debounceTimeout);
  }, [searchText]);

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

      // Create cache key based on query parameters and view type
      const cacheKey = `${preferences.viewType}-${searchText || "all"}-page${currentPage}-perPage${perPage}`;

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
        description: link.description,
        summary: link.summary,
        created_at: link.created_at,
        updated_at: link.updated_at,
        tags: link.tags,
        user: link.user,
      }));

      // If we're loading more, append to existing resources
      if (loadMore) {
        setResources((prevResources) => {
          // Filter out any duplicates that might exist
          const existingIds = new Set(prevResources.map((r) => r.id));
          const newResources = transformedResources.filter((r) => !existingIds.has(r.id));
          return [...prevResources, ...newResources];
        });
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

      // Clear any previous error
      setError(null);
    } catch (error) {
      console.error("Error fetching resources:", error);

      const errorMessage = error instanceof Error ? error.message : "Failed to fetch resources";
      setError(errorMessage);

      // Show error toast
      await showFailureToast(errorMessage, { title: "Error fetching resources" });
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

  // Show error state if there's an authentication error or invalid token
  const isTokenError =
    error &&
    (error.toLowerCase().includes("api token") ||
      error.toLowerCase().includes("authentication failed") ||
      error.toLowerCase().includes("sign in again") ||
      error.toLowerCase().includes("invalid api token"));

  if (isTokenError) {
    return (
      <Detail
        markdown={`
# Invalid or Expired API Token

Your Stacks API token is invalid or expired. Please update it in the extension preferences to continue using Stacks.

---

**How to update your token:**
1. Open betterstacks.com and log in
2. Open browser developer tools (Right-click → Inspect or Cmd+Option+I)
3. Go to 'Application' (Chrome) or 'Storage' (Firefox)
4. Find the 'gqlToken' cookie for betterstacks.com
5. Copy the value and paste it in Raycast extension preferences
        `}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  // Render based on view preference
  if (isGridView) {
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
          resources.map((resource) => (
            <Grid.Item
              key={resource.id}
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
                      <Action.CopyToClipboard
                        content={resource.description}
                        title="Copy Description"
                        icon={Icon.Text}
                      />
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      onAction={handleRefresh}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                    <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))
        ) : (
          <Grid.EmptyView
            title={
              isTokenError
                ? "Invalid or Expired API Token"
                : error || (searchText ? `No Results for "${searchText}"` : "No Resources Found")
            }
            description={
              isTokenError
                ? "Your Stacks API token is invalid or expired. Please update it in Preferences."
                : error
                  ? "Please try again or check your connection"
                  : searchText
                    ? "Try different search terms or clear the search"
                    : "Start saving resources to see them here"
            }
            icon={
              isTokenError
                ? Icon.ExclamationMark
                : error
                  ? Icon.ExclamationMark
                  : searchText
                    ? Icon.MagnifyingGlass
                    : Icon.Bookmark
            }
            actions={
              <ActionPanel>
                <Action
                  title={isTokenError ? "Open Extension Preferences" : "Refresh"}
                  icon={isTokenError ? Icon.Gear : Icon.ArrowClockwise}
                  onAction={isTokenError ? openExtensionPreferences : handleRefresh}
                  shortcut={{ modifiers: ["cmd"], key: isTokenError ? "k" : "r" }}
                />
                {!isTokenError && (
                  <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                )}
              </ActionPanel>
            }
          />
        )}
      </Grid>
    );
  } else {
    return (
      <List
        isLoading={isLoading}
        searchBarPlaceholder="Search your resources..."
        isShowingDetail
        onSearchTextChange={setSearchText}
        pagination={{
          onLoadMore: () => fetchResources(true),
          hasMore: hasMore,
          pageSize: perPage,
        }}
      >
        {resources.length > 0 ? (
          resources.map((resource) => (
            <List.Item
              key={resource.id}
              icon={
                resource.favicon_url
                  ? {
                      source: resource.favicon_url,
                      fallback: getIconForResourceType(resource.type),
                      mask: Image.Mask.RoundedRectangle,
                    }
                  : getIconForResourceType(resource.type)
              }
              title={resource.title}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.OpenInBrowser url={resource.target_url} title="Open in Browser" icon={Icon.Globe} />
                    <Action.CopyToClipboard content={resource.target_url} title="Copy URL" icon={Icon.Clipboard} />
                    {resource.description && (
                      <Action.CopyToClipboard
                        content={resource.description}
                        title="Copy Description"
                        icon={Icon.Text}
                      />
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      onAction={handleRefresh}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                    <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
              detail={
                <List.Item.Detail
                  markdown={
                    resource.thumbnail
                      ? `![](${resource.thumbnail})`
                      : `# ${resource.title || "Resource"}\n\n*No image available for this resource*`
                  }
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Title" text={resource.title} />

                      <List.Item.Detail.Metadata.Separator />

                      {resource.description && (
                        <List.Item.Detail.Metadata.Label
                          title="Description"
                          text={
                            resource.description.length > 200
                              ? resource.description.substring(0, 200) + "..."
                              : resource.description
                          }
                        />
                      )}

                      <List.Item.Detail.Metadata.Separator />

                      <List.Item.Detail.Metadata.Label
                        title="URL"
                        text={resource.url.length > 60 ? resource.url.substring(0, 60) + "..." : resource.url}
                        icon={Icon.Link}
                      />

                      <List.Item.Detail.Metadata.Separator />

                      <List.Item.Detail.Metadata.Label
                        title="Added"
                        text={formatDate(resource.created_at)}
                        icon={Icon.Calendar}
                      />

                      <List.Item.Detail.Metadata.Separator />

                      {resource.tags && resource.tags.length > 0 && (
                        <>
                          <List.Item.Detail.Metadata.TagList title="Tags">
                            {resource.tags.map((tag, tagIndex) => (
                              <List.Item.Detail.Metadata.TagList.Item
                                key={`${resource.id}-tag-${tagIndex}-${tag}`}
                                text={tag}
                                color={Color.Blue}
                              />
                            ))}
                          </List.Item.Detail.Metadata.TagList>

                          <List.Item.Detail.Metadata.Separator />
                        </>
                      )}

                      {resource.user && (
                        <List.Item.Detail.Metadata.Label
                          title="Added by"
                          text={resource.user.name || resource.user.username || resource.user.email || "Unknown user"}
                          icon={
                            resource.user.profile_image_url
                              ? {
                                  source: resource.user.profile_image_url,
                                  mask: Image.Mask.Circle,
                                }
                              : Icon.Person
                          }
                        />
                      )}

                      <List.Item.Detail.Metadata.Separator />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
            />
          ))
        ) : (
          <List.EmptyView
            title={
              isTokenError
                ? "Invalid or Expired API Token"
                : error || (searchText ? `No Results for "${searchText}"` : "No Resources Found")
            }
            description={
              isTokenError
                ? "Your Stacks API token is invalid or expired. Please update it in Preferences."
                : error
                  ? "Please try again or check your connection"
                  : searchText
                    ? "Try different search terms or clear the search"
                    : "Start saving resources to see them here"
            }
            icon={
              isTokenError
                ? Icon.ExclamationMark
                : error
                  ? Icon.ExclamationMark
                  : searchText
                    ? Icon.MagnifyingGlass
                    : Icon.Bookmark
            }
            actions={
              <ActionPanel>
                <Action
                  title={isTokenError ? "Open Extension Preferences" : "Refresh"}
                  icon={isTokenError ? Icon.Gear : Icon.ArrowClockwise}
                  onAction={isTokenError ? openExtensionPreferences : handleRefresh}
                  shortcut={{ modifiers: ["cmd"], key: isTokenError ? "k" : "r" }}
                />
                {!isTokenError && (
                  <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                )}
              </ActionPanel>
            }
          />
        )}
      </List>
    );
  }
}
