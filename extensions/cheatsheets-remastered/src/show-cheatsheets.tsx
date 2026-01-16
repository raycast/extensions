import React from "react";
import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  List,
  Form,
  useNavigation,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  LocalStorage,
  Clipboard,
  getPreferenceValues,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { showFailureToast, useFrecencySorting } from "@raycast/utils";

import Service, { CustomCheatsheet, FavoriteCheatsheet, RepositoryCheatsheet } from "./service";
import type { File as ServiceFile } from "./service";
import { stripFrontmatter, stripTemplateTags, formatTables, formatHtmlElements } from "./utils";
// GitHub icon for repository cheatsheets - using built-in icon
const githubIcon = Icon.Globe;

// (removed unused getCheatsheetIcon)

// Custom hook for draft persistence
function useDraftPersistence(key: string, defaultValue: string) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    // Load draft from storage
    LocalStorage.getItem<string>(key).then((stored) => {
      if (stored && stored !== defaultValue) {
        setValue(stored);
      }
    });
  }, [key, defaultValue]);

  const updateValue = (newValue: string) => {
    setValue(newValue);
    // Save to storage
    LocalStorage.setItem(key, newValue);
  };

  const clearDraft = () => {
    LocalStorage.removeItem(key);
    setValue(defaultValue);
  };

  return { value, updateValue, clearDraft };
}

type FilterType = "all" | "custom" | "default" | "repository" | "favorites" | "hidden";

interface UnifiedCheatsheet {
  id: string;
  type: "custom" | "default" | "repository";
  slug: string;
  title: string;
  isFavorited: boolean;
  repositoryId?: string; // For repository cheatsheets
  repositoryName?: string; // For display purposes
  isHidden?: boolean; // For hidden cheatsheets
}

function Command() {
  const [sheets, setSheets] = useState<string[]>([]);
  const [customSheets, setCustomSheets] = useState<CustomCheatsheet[]>([]);
  const [repositorySheets, setRepositorySheets] = useState<RepositoryCheatsheet[]>([]);
  const [favorites, setFavorites] = useState<FavoriteCheatsheet[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const preferences = getPreferenceValues<{ defaultSort: "frecency" | "lastViewed" | "mostViewed" | "alpha" }>();
  const sort = preferences.defaultSort;
  const [viewStats, setViewStats] = useState<Record<string, { count: number; lastViewedAt: number }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [contentResults, setContentResults] = useState<string[]>([]);
  const [unifiedList, setUnifiedList] = useState<UnifiedCheatsheet[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  // Update unified list when data changes
  useEffect(() => {
    const updateUnifiedList = async () => {
      const unified = await createUnifiedList();
      setUnifiedList(unified);
    };
    updateUnifiedList();
  }, [sheets, customSheets, repositorySheets, favorites]);

  // Add content search effect
  useEffect(() => {
    let mounted = true;
    async function run() {
      const q = searchQuery.trim();
      if (!q) {
        setContentResults([]);
        return;
      }
      const res = await Service.searchDefaultContent(q);
      if (mounted) setContentResults(res);
    }
    run();
    return () => {
      mounted = false;
    };
  }, [searchQuery]);

  async function loadData() {
    try {
      setIsLoading(true);
      setError(null);

      // Always try to fetch fresh data from online sources by default
      const [files, custom, repository, favs] = await Promise.all([
        Service.listFiles(),
        Service.getCustomCheatsheets(),
        Service.getRepositoryCheatsheets(),
        Service.getFavorites(),
      ]);

      if (files.length > 0) {
        const sheets = getSheets(files);
        setSheets(sheets);
      }

      setCustomSheets(custom);
      setRepositorySheets(repository);
      setFavorites(favs);
      setViewStats(await Service.getViewStatsMap());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cheatsheets");
      showFailureToast(err, { title: "Failed to load cheatsheets" });
    } finally {
      setIsLoading(false);
    }
  }

  // Create unified cheatsheet list
  const createUnifiedList = async (): Promise<UnifiedCheatsheet[]> => {
    const unified: UnifiedCheatsheet[] = [];

    // Get hidden cheatsheets to mark them
    const hiddenCheatsheets = await Service.getHiddenCheatsheets();
    const hiddenKeys = new Set(hiddenCheatsheets.map((h) => h.key));

    // Add custom cheatsheets
    customSheets.forEach((sheet) => {
      const key = `custom:${sheet.id}`;
      const isHidden = hiddenKeys.has(key);

      unified.push({
        id: sheet.id,
        type: "custom",
        slug: sheet.id,
        title: sheet.title,
        isFavorited: favorites.some((fav) => fav.slug === sheet.id && fav.type === "custom"),
        isHidden: isHidden,
      });
    });

    // Add online cheatsheets
    sheets.forEach((sheet) => {
      const key = `default:${sheet}`;
      const isHidden = hiddenKeys.has(key);

      unified.push({
        id: sheet,
        type: "default",
        slug: sheet,
        title: sheet,
        isFavorited: favorites.some((fav) => fav.slug === sheet && fav.type === "default"),
        isHidden: isHidden,
      });
    });

    // Add repository cheatsheets with proper repository names
    const userRepos = await Service.getUserRepositories();
    const repoMap = new Map(userRepos.map((repo) => [repo.id, repo]));

    repositorySheets.forEach((sheet) => {
      const key = `repository:${sheet.slug}`;
      const isHidden = hiddenKeys.has(key);
      const repo = repoMap.get(sheet.repositoryId);
      const repositoryName = repo ? `${repo.owner}/${repo.name}` : sheet.filePath.split("/")[0];
      const isFavorited = favorites.some((fav) => fav.slug === sheet.slug && fav.type === "repository");

      unified.push({
        id: sheet.id,
        type: "repository",
        slug: sheet.slug,
        title: sheet.title,
        isFavorited,
        repositoryId: sheet.repositoryId,
        repositoryName: repositoryName,
        isHidden: isHidden,
      });
    });

    return unified;
  };

  // Apply frequency sorting
  const { data: frecencyData } = useFrecencySorting(unifiedList, {
    namespace: "cheatsheets",
    key: (item) => `${item.type}-${item.slug}`,
    sortUnvisited: (a, b) => {
      // Sort unvisited items: favorites first, then alphabetically
      if (a.isFavorited && !b.isFavorited) return -1;
      if (!a.isFavorited && b.isFavorited) return 1;
      return a.title.localeCompare(b.title);
    },
  });

  // User sorting options using view stats
  const sortedData = [...frecencyData].sort((a, b) => {
    if (sort === "alpha") return a.title.localeCompare(b.title);
    const aKey = `${a.type}-${a.slug}`;
    const bKey = `${b.type}-${b.slug}`;
    const aStats = viewStats[aKey];
    const bStats = viewStats[bKey];
    if (sort === "lastViewed") return (bStats?.lastViewedAt || 0) - (aStats?.lastViewedAt || 0);
    if (sort === "mostViewed") return (bStats?.count || 0) - (aStats?.count || 0);
    return 0; // frecency default order
  });

  // Filter the sorted data
  const filteredData = sortedData.filter((item) => {
    // First apply type filter
    let typeMatch = false;
    switch (filter) {
      case "custom":
        typeMatch = item.type === "custom" && !item.isHidden;
        break;
      case "default":
        typeMatch = item.type === "default" && !item.isHidden;
        break;
      case "repository":
        typeMatch = item.type === "repository" && !item.isHidden;
        break;
      case "favorites":
        typeMatch = item.isFavorited && !item.isHidden;
        break;
      case "hidden":
        typeMatch = item.isHidden === true;
        break;
      default:
        typeMatch = !item.isHidden; // "all" shows only visible items
    }

    if (!typeMatch) return false;

    // Then apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();

      // For custom sheets, search in title, content, tags, and description
      if (item.type === "custom") {
        const customSheet = customSheets.find((s) => s.id === item.id);
        if (customSheet) {
          return (
            customSheet.title.toLowerCase().includes(query) ||
            customSheet.content.toLowerCase().includes(query) ||
            customSheet.tags?.some((tag) => tag.toLowerCase().includes(query)) ||
            customSheet.description?.toLowerCase().includes(query)
          );
        }
      }

      // For default sheets, search in title and content results
      if (item.type === "default") {
        return Service.defaultMatchesQuery(item.slug, searchQuery) || contentResults.includes(item.slug);
      }

      // For repository sheets, search in title and content
      if (item.type === "repository") {
        const repoSheet = repositorySheets.find((s) => s.id === item.id);
        if (repoSheet) {
          return (
            repoSheet.title.toLowerCase().includes(query) ||
            repoSheet.content.toLowerCase().includes(query) ||
            repoSheet.filePath.toLowerCase().includes(query) ||
            (item.repositoryName && item.repositoryName.toLowerCase().includes(query))
          );
        }
      }
    }

    return true;
  });

  // Separate title matches from content matches for better search results
  const titleMatches: UnifiedCheatsheet[] = [];
  const contentMatches: UnifiedCheatsheet[] = [];

  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();

    filteredData.forEach((item) => {
      let isTitleMatch = false;

      if (item.type === "custom") {
        const customSheet = customSheets.find((s) => s.id === item.id);
        if (customSheet) {
          isTitleMatch = customSheet.title.toLowerCase().includes(query);
        }
      } else if (item.type === "default") {
        isTitleMatch = Service.defaultMatchesQuery(item.slug, searchQuery);
      }

      if (isTitleMatch) {
        titleMatches.push(item);
      } else {
        contentMatches.push(item);
      }
    });
  }

  // Combine results: title matches first, then content matches
  const searchResults = searchQuery.trim() ? [...titleMatches, ...contentMatches] : filteredData;

  // Build recent list (top 3: prefer lastViewed, fallback to mostViewed if none)
  let recentItems = [...searchResults]
    .sort((a, b) => {
      const aKey = `${a.type}-${a.slug}`;
      const bKey = `${b.type}-${b.slug}`;
      return (viewStats[bKey]?.lastViewedAt || 0) - (viewStats[aKey]?.lastViewedAt || 0);
    })
    .filter((item) => !!viewStats[`${item.type}-${item.slug}`]?.lastViewedAt)
    .slice(0, 3);
  if (recentItems.length === 0) {
    recentItems = [...searchResults]
      .sort((a, b) => {
        const aKey = `${a.type}-${a.slug}`;
        const bKey = `${b.type}-${b.slug}`;
        return (viewStats[bKey]?.count || 0) - (viewStats[aKey]?.count || 0);
      })
      .filter((item) => (viewStats[`${item.type}-${item.slug}`]?.count || 0) > 0)
      .slice(0, 3);
  }

  async function handleDeleteCustomSheet(id: string, title: string) {
    const confirmed = await confirmAlert({
      title: "Delete Custom Cheatsheet",
      message: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await Service.deleteCustomCheatsheet(id);
        const updated = await Service.getCustomCheatsheets();
        setCustomSheets(updated);

        showToast({
          style: Toast.Style.Success,
          title: "Deleted",
          message: `"${title}" has been removed`,
        });
      } catch (err) {
        showFailureToast(err, { title: "Failed to delete cheatsheet" });
      }
    }
  }

  async function handleRefresh() {
    await loadData();
    showToast({
      style: Toast.Style.Success,
      title: "Refreshed",
      message: "Cheatsheets updated",
    });
  }

  async function handleToggleFavorite(item: UnifiedCheatsheet) {
    try {
      // Toggle favorite status for any cheatsheet type
      const newFavorited = await Service.toggleFavorite(item.type, item.slug, item.title);

      // Update local state
      const updatedFavorites = await Service.getFavorites();
      setFavorites(updatedFavorites);

      // Update the item's favorite status
      item.isFavorited = newFavorited;

      showToast({
        style: Toast.Style.Success,
        title: newFavorited ? "Added to Favorites" : "Removed from Favorites",
        message: `"${item.title}" ${newFavorited ? "is now" : "is no longer"} favorited`,
      });
    } catch (error) {
      showFailureToast(error, { title: "Failed to update favorite status" });
    }
  }

  async function handleToggleHidden(item: UnifiedCheatsheet) {
    try {
      // Toggle hidden status for any cheatsheet type
      const newHidden = await Service.toggleHidden(item.type, item.slug, item.title);

      // Refresh the unified list to reflect the change
      const unified = await createUnifiedList();
      setUnifiedList(unified);

      showToast({
        style: Toast.Style.Success,
        title: newHidden ? "Hidden" : "Shown",
        message: `"${item.title}" is now ${newHidden ? "hidden" : "visible"}`,
      });
    } catch (error) {
      showFailureToast(error, { title: "Failed to toggle visibility" });
    }
  }

  if (error) {
    return (
      <Detail
        markdown={`# Error Loading Cheatsheets\n\n${error}\n\nPlease try refreshing or check your internet connection.`}
        actions={
          <ActionPanel>
            <Action title="Retry" icon={Icon.ArrowClockwise} onAction={loadData} />
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={handleRefresh} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search cheatsheets..."
      searchText={searchQuery}
      onSearchTextChange={setSearchQuery}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" value={filter} onChange={(value) => setFilter(value as FilterType)}>
          <List.Dropdown.Item title="All" value="all" icon={Icon.AppWindowList} />
          <List.Dropdown.Item title="Favorites" value="favorites" icon={Icon.Star} />
          <List.Dropdown.Item title="Custom" value="custom" icon={Icon.Brush} />
          <List.Dropdown.Item title="Default" value="default" icon={Icon.Box} />
          <List.Dropdown.Item title="GitHub" value="repository" icon={githubIcon} />
          <List.Dropdown.Item title="Hidden" value="hidden" icon={Icon.EyeDisabled} />
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={handleRefresh} />
          <Action.Push
            title="Create Custom Cheatsheet"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            target={
              <CreateCustomSheetForm
                onCreated={async () => {
                  const updated = await Service.getCustomCheatsheets();
                  setCustomSheets(updated);
                }}
              />
            }
          />
        </ActionPanel>
      }
    >
      <List.Section title="Overview" subtitle={`${searchResults.length} items • ${filter} • ${sort}`} />

      {searchResults.length === 0 && !isLoading && !error && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No cheatsheets found"
          description={
            searchQuery
              ? `No cheatsheets match "${searchQuery}"`
              : "No cheatsheets available yet. Try refreshing or check your connection."
          }
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={handleRefresh} />
              <Action.Push
                title="Create Custom Cheatsheet"
                icon={Icon.Plus}
                target={
                  <CreateCustomSheetForm
                    onCreated={async () => {
                      const updated = await Service.getCustomCheatsheets();
                      setCustomSheets(updated);
                    }}
                  />
                }
              />
            </ActionPanel>
          }
        />
      )}

      {searchQuery && (
        <>
          {titleMatches.length > 0 && (
            <List.Section title="Title Matches" subtitle={`${titleMatches.length} cheatsheets with matching titles`} />
          )}

          {contentMatches.length > 0 && (
            <List.Section
              title="Content Matches"
              subtitle={`${contentMatches.length} cheatsheets with matching content`}
            />
          )}

          {titleMatches.length === 0 && contentMatches.length === 0 && (
            <List.Section title="Search Results" subtitle={`No cheatsheets found for "${searchQuery}"`}>
              <List.Item
                title="No results found"
                subtitle={`Try a different search term or check your spelling`}
                icon={Icon.MagnifyingGlass}
              />
            </List.Section>
          )}
        </>
      )}

      {recentItems.length > 0 && (
        <List.Section title="Recently Viewed" subtitle={`${recentItems.length} items`}>
          {recentItems.map((item) => (
            <List.Item
              key={`recent-${item.id}`}
              title={item.title}
              subtitle=""
              icon={
                item.type === "custom"
                  ? Icon.Box
                  : item.type === "repository"
                    ? Icon.Globe
                    : item.type === "default"
                      ? Icon.Box
                      : Icon.Document
              }
              accessories={[
                { text: "Recent", icon: Icon.Clock },
                ...(item.isHidden ? [{ icon: Icon.EyeDisabled, tooltip: "Hidden" }] : []),
                ...(item.type === "custom"
                  ? (customSheets.find((s) => s.id === item.id)?.tags || [])
                      .slice(0, 3)
                      .map((tag) => ({ text: tag, icon: Icon.Tag }))
                  : item.type === "default"
                    ? (Service.getDefaultMetadata(item.slug)?.tags || [])
                        .slice(0, 3)
                        .map((tag) => ({ text: tag, icon: Icon.Tag }))
                    : []),
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Open Cheatsheet"
                    icon={Icon.Window}
                    target={
                      item.type === "custom" ? (
                        <CustomSheetView sheet={customSheets.find((s) => s.id === item.id)!} />
                      ) : (
                        <SheetView slug={item.slug} />
                      )
                    }
                  />
                  <Action
                    title={item.isHidden ? "Show Cheatsheet" : "Hide Cheatsheet"}
                    icon={item.isHidden ? Icon.Eye : Icon.EyeDisabled}
                    onAction={() => handleToggleHidden(item)}
                    shortcut={{ modifiers: ["cmd"], key: "h" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {searchResults.map((item) => (
        <List.Item
          key={item.id}
          title={item.title}
          subtitle={
            item.type === "custom"
              ? customSheets.find((s) => s.id === item.id)?.description || ""
              : item.type === "repository"
                ? item.repositoryName || ""
                : ""
          }
          icon={
            item.type === "custom"
              ? Icon.Brush
              : item.type === "repository"
                ? Icon.Globe
                : item.type === "default"
                  ? Icon.Box
                  : Icon.Document
          }
          keywords={
            item.type === "custom"
              ? customSheets.find((s) => s.id === item.id)?.tags || []
              : item.type === "repository"
                ? ["repository", "github", item.repositoryName || ""].filter(Boolean)
                : Service.getDefaultMetadata(item.slug)?.tags || []
          }
          accessories={[
            ...(item.isFavorited ? [{ icon: Icon.Star, tooltip: "Favorited" }] : []),
            ...(item.isHidden ? [{ icon: Icon.EyeDisabled, tooltip: "Hidden" }] : []),
            ...(item.type === "custom"
              ? (customSheets.find((s) => s.id === item.id)?.tags || [])
                  .slice(0, 3)
                  .map((tag) => ({ text: tag, icon: Icon.Tag }))
              : item.type === "default"
                ? (Service.getDefaultMetadata(item.slug)?.tags || [])
                    .slice(0, 3)
                    .map((tag) => ({ text: tag, icon: Icon.Tag }))
                : []),
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="View">
                <Action.Push
                  title="Open Cheatsheet"
                  icon={Icon.Window}
                  target={
                    item.type === "custom" ? (
                      <CustomSheetView sheet={customSheets.find((s) => s.id === item.id)!} />
                    ) : item.type === "repository" ? (
                      <RepositorySheetView sheet={repositorySheets.find((s) => s.id === item.id)!} />
                    ) : (
                      <SheetView slug={item.slug} />
                    )
                  }
                  onPush={async () => {
                    await Service.recordView(item.type, item.slug, item.title);
                    if (item.type === "repository") {
                      await Service.recordRepositoryCheatsheetAccess(item.id);
                    }
                    const stats = await Service.getViewStatsMap();
                    setViewStats(stats);
                  }}
                />
                {item.type === "default" && (
                  <Action.OpenInBrowser url={Service.urlFor(item.slug)} title="Open in Browser" icon={Icon.Link} />
                )}
              </ActionPanel.Section>
              <ActionPanel.Section title="Actions">
                <Action
                  title={item.isFavorited ? "Remove from Favorites" : "Add to Favorites"}
                  icon={item.isFavorited ? Icon.StarDisabled : Icon.Star}
                  onAction={() => handleToggleFavorite(item)}
                  shortcut={{ modifiers: ["cmd"], key: "f" }}
                />
                <Action
                  title={item.isHidden ? "Show Cheatsheet" : "Hide Cheatsheet"}
                  icon={item.isHidden ? Icon.Eye : Icon.EyeDisabled}
                  onAction={() => handleToggleHidden(item)}
                  shortcut={{ modifiers: ["cmd"], key: "h" }}
                />
                <Action.CopyToClipboard title="Copy Title" content={item.title} icon={Icon.CopyClipboard} />
                {item.type === "default" && (
                  <Action
                    title="Copy Full Content"
                    icon={Icon.CopyClipboard}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                    onAction={async () => {
                      const content = await Service.getSheet(item.slug);
                      await Clipboard.copy(content);
                      showToast({
                        style: Toast.Style.Success,
                        title: "Copied",
                        message: "Full sheet copied",
                      });
                    }}
                  />
                )}
                {item.type === "custom" && (
                  <Action
                    title="Copy Full Content"
                    icon={Icon.CopyClipboard}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                    onAction={async () => {
                      const sheet = customSheets.find((s) => s.id === item.id);
                      if (sheet) {
                        await Clipboard.copy(sheet.content);
                        showToast({
                          style: Toast.Style.Success,
                          title: "Copied",
                          message: "Full sheet copied",
                        });
                      }
                    }}
                  />
                )}
                {item.type === "custom" && (
                  <Action.Push
                    title="Edit Custom Cheatsheet"
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    target={
                      <EditCustomSheetForm
                        sheet={customSheets.find((s) => s.id === item.id)!}
                        onUpdated={async () => {
                          const updated = await Service.getCustomCheatsheets();
                          setCustomSheets(updated);
                        }}
                      />
                    }
                  />
                )}
              </ActionPanel.Section>
              {item.type === "custom" && (
                <ActionPanel.Section title="Danger Zone">
                  <Action
                    title="Delete Custom Cheatsheet"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleDeleteCustomSheet(item.id, item.title)}
                  />
                </ActionPanel.Section>
              )}
            </ActionPanel>
          }
        />
      ))}

      {!isLoading && searchResults.length > 0 && (
        <List.Item
          title="Create New Custom Cheatsheet"
          subtitle="Add your own cheatsheet"
          icon={Icon.Plus}
          accessories={[{ text: "New", icon: Icon.Star }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Create New"
                icon={Icon.Plus}
                target={
                  <CreateCustomSheetForm
                    onCreated={async () => {
                      const updated = await Service.getCustomCheatsheets();
                      setCustomSheets(updated);
                    }}
                  />
                }
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

// Helper function to get sheets from files
function getSheets(files: ServiceFile[]): string[] {
  return files
    .filter((file) => {
      const isDir = file.type === "tree";
      const isMarkdown = file.path.endsWith(".md");

      // Skip if directory or not markdown
      if (isDir || !isMarkdown) {
        return false;
      }

      // Admin and documentation file exclusions - be more precise
      const isNotAdminFile = !file.path.match(/^(README|CONTRIBUTING|index|index@2016)\.md$/i);
      const isNotInGitHubDir = !file.path.startsWith(".github/");
      const isNotCodeOfConduct = !file.path.match(/code[_-]of[_-]conduct\.md$/i);
      const isNotLicense = !file.path.match(/^(LICENSE|LICENCE)\.md$/i);
      const isNotChangelog = !file.path.match(/^(CHANGELOG|HISTORY)\.md$/i);
      const isNotSecurity = !file.path.match(/^(SECURITY|SECURITY\.md)$/i);
      const isNotContributing = !file.path.match(/^(CONTRIBUTING|CONTRIBUTING\.md)$/i);
      const isNotPullRequestTemplate = !file.path.match(/pull_request_template\.md$/i);
      const isNotIssueTemplate = !file.path.startsWith(".github/ISSUE_TEMPLATE/");
      const isNotWorkflow = !file.path.startsWith(".github/workflows/");
      const isNotReleaseNotes = !file.path.match(/^(RELEASES?|RELEASE[_-]NOTES?)\.md$/i);
      const isNotAuthors = !file.path.match(/^(AUTHORS?|CONTRIBUTORS?)\.md$/i);
      const isNotRoadmap = !file.path.match(/^(ROADMAP|ROAD[_-]MAP)\.md$/i);
      const isNotTodo = !file.path.match(/^(TODO|TASKS?)\.md$/i);
      const isNotInstallation = !file.path.match(/^(INSTALL|INSTALLATION)\.md$/i);
      const isNotGettingStarted = !file.path.match(/^(GETTING[_-]STARTED|QUICK[_-]START)\.md$/i);

      // Directory and file pattern exclusions
      const isNotInUnderscoreDir = !file.path.match(/(^|\/)_[^/]+/); // Exclude dirs starting with _
      const isNotAtSymbolFile = !file.path.includes("@"); // Exclude files with @ in name
      const isNotInUnderscoreFile = !file.path.match(/_[^/]*\.md$/); // Exclude files starting with _

      // Additional exclusions for common non-cheatsheet files
      const isNotIndexFile = !file.path.match(/^(Index|IndexASVS|IndexMASVS|IndexProactiveControls|IndexTopTen)\.md$/i);
      const isNotPrefaceFile = !file.path.match(/^(Preface|HelpGuide)\.md$/i);
      const isNotProjectFile = !file.path.match(/^Project\.[^/]*\.md$/i);

      return (
        isNotAdminFile &&
        isNotInGitHubDir &&
        isNotCodeOfConduct &&
        isNotLicense &&
        isNotChangelog &&
        isNotSecurity &&
        isNotContributing &&
        isNotPullRequestTemplate &&
        isNotIssueTemplate &&
        isNotWorkflow &&
        isNotReleaseNotes &&
        isNotAuthors &&
        isNotRoadmap &&
        isNotTodo &&
        isNotInstallation &&
        isNotGettingStarted &&
        isNotInUnderscoreDir &&
        isNotAtSymbolFile &&
        isNotInUnderscoreFile &&
        isNotIndexFile &&
        isNotPrefaceFile &&
        isNotProjectFile
      );
    })
    .map((file) => file.path.replace(".md", ""));
}

interface SheetProps {
  slug: string;
}

function SheetView({ slug }: SheetProps) {
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSheet();
  }, [slug]);

  async function loadSheet() {
    try {
      setIsLoading(true);
      setError(null);
      const sheetContent = await Service.getSheet(slug);
      setContent(sheetContent);
      // Record view for default sheet
      await Service.recordView("default", slug, slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cheatsheet");
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return <Detail markdown="Loading..." />;
  }

  if (error) {
    return (
      <Detail
        markdown={`# Error Loading Cheatsheet\n\n${error}\n\nPlease try refreshing or check your internet connection.`}
        actions={
          <ActionPanel>
            <Action title="Retry" icon={Icon.ArrowClockwise} onAction={loadSheet} />
          </ActionPanel>
        }
      />
    );
  }

  const processedContent = formatHtmlElements(formatTables(stripTemplateTags(stripFrontmatter(content))));
  const isLocal = Service.isLocalCheatsheet(slug);

  return (
    <Detail
      markdown={processedContent}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Actions">
            <Action.CopyToClipboard title="Copy Content" content={processedContent} icon={Icon.CopyClipboard} />
            <Action.CopyToClipboard title="Copy Title" content={slug} icon={Icon.CopyClipboard} />
            <Action.OpenInBrowser url={Service.urlFor(slug)} title="Open in Browser" icon={Icon.Link} />
          </ActionPanel.Section>
          {isLocal && (
            <ActionPanel.Section title="About">
              <Action.OpenInBrowser title="Open Devhints Website" icon={Icon.Globe} url="https://devhints.io" />
              <Action.OpenInBrowser
                title="Open Devhints on GitHub"
                icon={Icon.Link}
                url="https://github.com/rstacruz/cheatsheets"
              />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}

interface CustomSheetProps {
  sheet: CustomCheatsheet;
}

function CustomSheetView({ sheet }: CustomSheetProps) {
  useEffect(() => {
    Service.recordView("custom", sheet.id, sheet.title);
  }, [sheet.id]);
  return (
    <Detail
      markdown={`# ${sheet.title}\n\n${sheet.content}`}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Actions">
            <Action.CopyToClipboard title="Copy Content" content={sheet.content} icon={Icon.CopyClipboard} />
            <Action.CopyToClipboard title="Copy Title" content={sheet.title} icon={Icon.CopyClipboard} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

interface EditCustomSheetProps {
  sheet: CustomCheatsheet;
  onUpdated: () => void;
}

function EditCustomSheetForm({ sheet, onUpdated }: EditCustomSheetProps) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const {
    value: title,
    updateValue: updateTitle,
    clearDraft: clearTitleDraft,
  } = useDraftPersistence(`edit-custom-sheet-title-${sheet.id}`, sheet.title);

  const {
    value: content,
    updateValue: updateContent,
    clearDraft: clearContentDraft,
  } = useDraftPersistence(`edit-custom-sheet-content-${sheet.id}`, sheet.content);

  const {
    value: tags,
    updateValue: updateTags,
    clearDraft: clearTagsDraft,
  } = useDraftPersistence(`edit-custom-sheet-tags-${sheet.id}`, (sheet.tags || []).join(", "));

  const {
    value: description,
    updateValue: updateDescription,
    clearDraft: clearDescriptionDraft,
  } = useDraftPersistence(`edit-custom-sheet-description-${sheet.id}`, sheet.description || "");

  const handleSubmit = async (values: { title: string; content: string; tags?: string; description?: string }) => {
    try {
      setIsSubmitting(true);
      setShowErrors(true);
      if (!values.title?.trim() || !values.content?.trim()) {
        setIsSubmitting(false);
        return;
      }

      const tagsArray = values.tags
        ? values.tags
            .split(",")
            .map((tag: string) => tag.trim())
            .filter(Boolean)
        : [];

      await Service.updateCustomCheatsheet(sheet.id, values.title, values.content, tagsArray, values.description);

      // Clear drafts after successful submission
      clearTitleDraft();
      clearContentDraft();
      clearTagsDraft();
      clearDescriptionDraft();

      onUpdated();
      pop();

      showToast({
        style: Toast.Style.Success,
        title: "Updated",
        message: `"${values.title}" has been modified`,
      });
    } catch (error) {
      showFailureToast(error, { title: "Failed to update cheatsheet" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Custom Cheatsheet" onSubmit={handleSubmit} icon={Icon.Document} />
          <Action
            title="Reset Draft"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={() => {
              clearTitleDraft();
              clearContentDraft();
              clearTagsDraft();
              clearDescriptionDraft();
              showToast({ style: Toast.Style.Success, title: "Draft Cleared" });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Enter cheatsheet title"
        value={title}
        onChange={updateTitle}
        error={showErrors && !title.trim() ? "Title is required" : undefined}
      />

      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Enter cheatsheet content (Markdown supported)"
        value={content}
        onChange={updateContent}
        error={showErrors && !content.trim() ? "Content is required" : undefined}
      />

      <Form.TextField
        id="tags"
        title="Tags"
        placeholder="Enter tags separated by commas"
        value={tags}
        onChange={updateTags}
      />

      <Form.TextField
        id="description"
        title="Description"
        placeholder="Enter optional description"
        value={description}
        onChange={updateDescription}
      />
    </Form>
  );
}

interface CreateCustomSheetProps {
  onCreated: () => void;
}

function CreateCustomSheetForm({ onCreated }: CreateCustomSheetProps) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const {
    value: title,
    updateValue: updateTitle,
    clearDraft: clearTitleDraft,
  } = useDraftPersistence("create-custom-sheet-title", "");

  const {
    value: content,
    updateValue: updateContent,
    clearDraft: clearContentDraft,
  } = useDraftPersistence("create-custom-sheet-content", "");

  const {
    value: tags,
    updateValue: updateTags,
    clearDraft: clearTagsDraft,
  } = useDraftPersistence("create-custom-sheet-tags", "");

  const {
    value: description,
    updateValue: updateDescription,
    clearDraft: clearDescriptionDraft,
  } = useDraftPersistence("create-custom-sheet-description", "");

  const handleSubmit = async (values: { title: string; content: string; tags?: string; description?: string }) => {
    try {
      setIsSubmitting(true);
      setShowErrors(true);

      const tagsArray = values.tags
        ? values.tags
            .split(",")
            .map((tag: string) => tag.trim())
            .filter(Boolean)
        : [];

      await Service.createCustomCheatsheet(values.title, values.content, tagsArray, values.description);

      // Clear drafts after successful submission
      clearTitleDraft();
      clearContentDraft();
      clearTagsDraft();
      clearDescriptionDraft();

      onCreated();
      pop();

      showToast({
        style: Toast.Style.Success,
        title: "Created",
        message: `"${values.title}" has been added`,
      });
    } catch (error) {
      showFailureToast(error, { title: "Failed to create cheatsheet" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Custom Cheatsheet" onSubmit={handleSubmit} icon={Icon.Document} />
          <Action
            title="Reset Draft"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={() => {
              clearTitleDraft();
              clearContentDraft();
              clearTagsDraft();
              clearDescriptionDraft();
              showToast({ style: Toast.Style.Success, title: "Draft Cleared" });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Enter cheatsheet title"
        value={title}
        onChange={updateTitle}
        error={showErrors && !title.trim() ? "Title is required" : undefined}
      />

      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Enter cheatsheet content (Markdown supported)"
        value={content}
        onChange={updateContent}
        error={showErrors && !content.trim() ? "Content is required" : undefined}
      />

      <Form.TextField
        id="tags"
        title="Tags"
        placeholder="Enter tags separated by commas"
        value={tags}
        onChange={updateTags}
      />

      <Form.TextField
        id="description"
        title="Description"
        placeholder="Enter optional description"
        value={description}
        onChange={updateDescription}
      />
    </Form>
  );
}

// Repository cheatsheet view component
function RepositorySheetView({ sheet }: { sheet: RepositoryCheatsheet }) {
  const [isLoading] = useState(false);
  const [repository, setRepository] = useState<{ owner: string; name: string; defaultBranch: string } | null>(null);

  useEffect(() => {
    // Record view for repository sheet
    Service.recordRepositoryCheatsheetAccess(sheet.repositoryId);

    // Fetch repository information
    const fetchRepository = async () => {
      try {
        const userRepos = await Service.getUserRepositories();
        const repo = userRepos.find((r) => r.id === sheet.repositoryId);
        if (repo) {
          setRepository({
            owner: repo.owner,
            name: repo.name,
            defaultBranch: repo.defaultBranch,
          });
        }
      } catch (err) {
        console.error("Failed to fetch repository info:", err);
      }
    };

    fetchRepository();
  }, [sheet.repositoryId]);

  const processedContent = formatHtmlElements(formatTables(stripTemplateTags(stripFrontmatter(sheet.content))));

  // Construct GitHub URLs
  const githubUrl = repository
    ? `https://github.com/${repository.owner}/${repository.name}/blob/${repository.defaultBranch}/${sheet.filePath}`
    : null;
  const repositoryUrl = repository ? `https://github.com/${repository.owner}/${repository.name}` : null;

  return (
    <Detail
      isLoading={isLoading}
      markdown={processedContent}
      navigationTitle={sheet.title}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Title" text={sheet.title} />
          {repositoryUrl ? (
            <Detail.Metadata.Link
              title="Repository"
              target={repositoryUrl}
              text={`${repository.owner}/${repository.name}`}
            />
          ) : (
            <Detail.Metadata.Label title="Repository" text={sheet.repositoryId} />
          )}
          {githubUrl ? (
            <Detail.Metadata.Link title="File Path" target={githubUrl} text={sheet.filePath} />
          ) : (
            <Detail.Metadata.Label title="File Path" text={sheet.filePath} />
          )}
          <Detail.Metadata.Label
            title="Synced"
            text={new Date(sheet.syncedAt).toLocaleDateString()}
            icon={Icon.Clock}
          />
          {sheet.lastAccessedAt && (
            <Detail.Metadata.Label
              title="Last Accessed"
              text={new Date(sheet.lastAccessedAt).toLocaleDateString()}
              icon={Icon.Eye}
            />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {repositoryUrl && (
            <ActionPanel.Section title="GitHub">
              <Action.OpenInBrowser title="View Repository" url={repositoryUrl} icon={Icon.Globe} />
              {githubUrl && <Action.OpenInBrowser title="View File on GitHub" url={githubUrl} icon={Icon.Document} />}
              <Action.CopyToClipboard title="Copy Repository URL" content={repositoryUrl} icon={Icon.Clipboard} />
              {githubUrl && <Action.CopyToClipboard title="Copy File URL" content={githubUrl} icon={Icon.Clipboard} />}
            </ActionPanel.Section>
          )}
          <ActionPanel.Section title="Actions">
            <Action.CopyToClipboard title="Copy Content" content={sheet.content} icon={Icon.CopyClipboard} />
            <Action.CopyToClipboard title="Copy Title" content={sheet.title} icon={Icon.CopyClipboard} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export { EditCustomSheetForm, CustomSheetView, SheetView, RepositorySheetView };
export default Command;
