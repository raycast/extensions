import { useState, useEffect } from "react";
import { ActionPanel, Action, Icon, List, Color, showToast, Toast, Image, Cache } from "@raycast/api";
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
  namespace: "stacks-resources-list",
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

// List View Command
export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [resources, setResources] = useState<Resource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const perPage = 20; // Number of items per page
  const [hasToken, setHasToken] = useState<boolean | null>(null);

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
        setIsLoading(true);
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

        // Save to cache (expires automatically by LRU policy)
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
        setResources((prevResources) => [...prevResources, ...transformedResources]);
        // Update page only when loading more
        setPage(currentPage);
      } else {
        setResources(transformedResources);
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
      fetchResources(false);
    }
  }, [searchText, hasToken]);

  // Show welcome screen if no token is set
  if (hasToken === false) {
    return <Welcome onComplete={() => setHasToken(true)} />;
  }

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
        resources.map((resource, index) => (
          <List.Item
            key={`${resource.id}-${index}`}
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
                  <Action.Push title="Manage Api Token" icon={Icon.Key} target={<TokenManagement />} />
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
                          {resource.tags.map((tag, index) => (
                            <List.Item.Detail.Metadata.TagList.Item key={index} text={tag} color={Color.Blue} />
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
    </List>
  );
}
