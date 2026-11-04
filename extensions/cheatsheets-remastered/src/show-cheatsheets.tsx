import { includeRepositoryFile } from "./repository-sync";
import { SearchSections } from "./search-sections";
import { shortcut } from "./shortcuts";
import { Keyboard } from "@raycast/api";
import React from "react";
import { CreateCustomCheatsheet } from "./create-custom-cheatsheet";
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
  Clipboard,
  getPreferenceValues,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { showFailureToast, useFrecencySorting } from "@raycast/utils";

import Service, { CustomCheatsheet, FavoriteCheatsheet, RepositoryCheatsheet } from "./service";
import type { File as ServiceFile } from "./service";
import { displayMarkdown } from "./markdown";
import { partitionTitleMatches } from "./search";
// GitHub icon for repository cheatsheets - using built-in icon
const githubIcon = Icon.Globe;

import { useDraftPersistence } from "./use-draft";

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
    let active = true;
    const updateUnifiedList = async () => {
      try {
        const unified = await createUnifiedList();
        if (active) setUnifiedList(unified);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Storage unavailable");
      }
    };
    void updateUnifiedList();
    return () => {
      active = false;
    };
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
    void run().catch((error) => {
      if (mounted) setError(error instanceof Error ? error.message : "Bundled search unavailable");
    });
    return () => {
      mounted = false;
    };
  }, [searchQuery]);

  async function loadData() {
    try {
      setIsLoading(true);
      setError(null);

      // Browsing reads bundled assets and the saved library without network access.
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
      const unresolved = await Service.getMigrationWarnings();
      if (unresolved.length)
        await showToast({
          style: Toast.Style.Failure,
          title: "Some Legacy State Needs Review",
          message: `${unresolved.length} ambiguous or missing repository paths were preserved. Reapply favorites/hidden state to the correct sheets; see README migration notes.`,
        });
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
      const key = `repository:${sheet.id}`;
      const isHidden = hiddenKeys.has(key);
      const repo = repoMap.get(sheet.repositoryId);
      const repositoryName = repo ? `${repo.owner}/${repo.name}` : sheet.filePath.split("/")[0];
      const isFavorited = favorites.some((fav) => fav.slug === sheet.id && fav.type === "repository");

      unified.push({
        id: sheet.id,
        type: "repository",
        slug: sheet.id,
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
  const { data: frecencyData, visitItem } = useFrecencySorting(unifiedList, {
    namespace: "cheatsheets",
    key: (item) => `${item.type}:${item.slug}`,
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
    const aKey = `${a.type}:${a.slug}`;
    const bKey = `${b.type}:${b.slug}`;
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
      const query = searchQuery.trim().toLowerCase();

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

  const { titles: titleMatches, content: contentMatches } = partitionTitleMatches(filteredData, searchQuery);

  // Combine results: title matches first, then content matches
  const searchResults = searchQuery.trim() ? [...titleMatches, ...contentMatches] : filteredData;

  // Build recent list (top 3: prefer lastViewed, fallback to mostViewed if none)
  let recentItems = [...searchResults]
    .sort((a, b) => {
      const aKey = `${a.type}:${a.slug}`;
      const bKey = `${b.type}:${b.slug}`;
      return (viewStats[bKey]?.lastViewedAt || 0) - (viewStats[aKey]?.lastViewedAt || 0);
    })
    .filter((item) => !!viewStats[`${item.type}:${item.slug}`]?.lastViewedAt)
    .slice(0, 3);
  if (recentItems.length === 0) {
    recentItems = [...searchResults]
      .sort((a, b) => {
        const aKey = `${a.type}:${a.slug}`;
        const bKey = `${b.type}:${b.slug}`;
        return (viewStats[bKey]?.count || 0) - (viewStats[aKey]?.count || 0);
      })
      .filter((item) => (viewStats[`${item.type}:${item.slug}`]?.count || 0) > 0)
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
  }

  async function handleToggleFavorite(item: UnifiedCheatsheet) {
    try {
      // Toggle favorite status for any cheatsheet type
      const newFavorited = await Service.toggleFavorite(item.type, item.slug, item.title);

      // Update local state
      const updatedFavorites = await Service.getFavorites();
      setFavorites(updatedFavorites);

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
        markdown={`# Error Loading Cheatsheets\n\n${error}\n\nRetry after checking the error above. Preserve your personal data before reinstalling.`}
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
      filtering={false}
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
            shortcut={Keyboard.Shortcut.Common.New}
            target={<CreateCustomSheetForm onCreated={loadData} />}
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
              : "No cheatsheets available yet. Refresh or create a custom cheatsheet."
          }
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={handleRefresh} />
              <Action.Push
                title="Create Custom Cheatsheet"
                icon={Icon.Plus}
                target={<CreateCustomSheetForm onCreated={loadData} />}
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

      {!searchQuery.trim() && recentItems.length > 0 && (
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
                    onPop={loadData}
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
                  />
                  <Action
                    title={item.isHidden ? "Show Cheatsheet" : "Hide Cheatsheet"}
                    icon={item.isHidden ? Icon.Eye : Icon.EyeDisabled}
                    onAction={() => handleToggleHidden(item)}
                    shortcut={shortcut("h")}
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
                  onPop={loadData}
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
                  onPush={() => {
                    void visitItem(item);
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
                  shortcut={shortcut("f")}
                />
                <Action
                  title={item.isHidden ? "Show Cheatsheet" : "Hide Cheatsheet"}
                  icon={item.isHidden ? Icon.Eye : Icon.EyeDisabled}
                  onAction={() => handleToggleHidden(item)}
                  shortcut={shortcut("h")}
                />
                <Action.CopyToClipboard title="Copy Title" content={item.title} icon={Icon.CopyClipboard} />
                {item.type === "default" && (
                  <Action
                    title="Copy Full Content"
                    icon={Icon.CopyClipboard}
                    shortcut={Keyboard.Shortcut.Common.Copy}
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
                    shortcut={Keyboard.Shortcut.Common.Copy}
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
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    target={
                      <EditCustomSheetForm sheet={customSheets.find((s) => s.id === item.id)!} onUpdated={loadData} />
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
                target={<CreateCustomSheetForm onCreated={loadData} />}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

function getSheets(files: ServiceFile[]): string[] {
  return files
    .filter((file) => file.type === "blob" && includeRepositoryFile(file.path))
    .map((file) => file.path.replace(/\.md$/i, ""));
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
      await Service.recordView("default", slug, slug).catch((error) =>
        showFailureToast(error, { title: "Could Not Save View History" }),
      );
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
        markdown={`# Error Loading Cheatsheet\n\n${error}\n\nRetry after checking the error above. Preserve your personal data before reinstalling.`}
        actions={
          <ActionPanel>
            <Action title="Retry" icon={Icon.ArrowClockwise} onAction={loadSheet} />
          </ActionPanel>
        }
      />
    );
  }

  const processedContent = displayMarkdown(content, true);
  const isLocal = Service.isLocalCheatsheet(slug);

  return (
    <Detail
      markdown={processedContent}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Actions">
            <Action.CopyToClipboard title="Copy Original Markdown" content={content} icon={Icon.CopyClipboard} />
            <Action.CopyToClipboard title="Copy Title" content={slug} icon={Icon.CopyClipboard} />
            <Action.Push
              title="Search Within Sheet"
              icon={Icon.MagnifyingGlass}
              shortcut={shortcut("f")}
              target={<SearchSections title={slug} source={content} bundled />}
            />
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
    Service.recordView("custom", sheet.id, sheet.title).catch((error) =>
      showFailureToast(error, { title: "Could Not Save View History" }),
    );
  }, [sheet.id]);
  return (
    <Detail
      navigationTitle={sheet.title}
      markdown={displayMarkdown(sheet.content)}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Actions">
            <Action.CopyToClipboard title="Copy Original Markdown" content={sheet.content} icon={Icon.CopyClipboard} />
            <Action.CopyToClipboard title="Copy Title" content={sheet.title} icon={Icon.CopyClipboard} />
            <Action.Push
              title="Search Within Sheet"
              icon={Icon.MagnifyingGlass}
              shortcut={shortcut("f")}
              target={<SearchSections title={sheet.title} source={sheet.content} />}
            />
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
    isReady: titleReady,
    updateValue: updateTitle,
    clearDraft: clearTitleDraft,
  } = useDraftPersistence<string>(`edit-custom-sheet-title-${sheet.id}`, sheet.title);

  const {
    value: content,
    isReady: contentReady,
    updateValue: updateContent,
    clearDraft: clearContentDraft,
  } = useDraftPersistence<string>(`edit-custom-sheet-content-${sheet.id}`, sheet.content);

  const {
    value: tags,
    isReady: tagsReady,
    updateValue: updateTags,
    clearDraft: clearTagsDraft,
  } = useDraftPersistence<string>(`edit-custom-sheet-tags-${sheet.id}`, (sheet.tags || []).join(", "));

  const {
    value: description,
    isReady: descriptionReady,
    updateValue: updateDescription,
    clearDraft: clearDescriptionDraft,
  } = useDraftPersistence<string>(`edit-custom-sheet-description-${sheet.id}`, sheet.description || "");

  const handleSubmit = async (values: { title: string; content: string; tags?: string; description?: string }) => {
    try {
      if (!(titleReady && contentReady && tagsReady && descriptionReady))
        throw new Error("Wait for saved drafts to load. If loading failed, preserve your text and reopen the form.");
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

      await Service.updateCustomCheatsheet(
        sheet.id,
        values.title,
        values.content,
        tagsArray,
        values.description,
        sheet.updatedAt,
      );

      // Clear drafts after successful submission
      const draftsCleared = (
        await Promise.all([clearTitleDraft(), clearContentDraft(), clearTagsDraft(), clearDescriptionDraft()])
      ).every(Boolean);

      onUpdated();
      pop();

      showToast({
        style: Toast.Style.Success,
        title: "Updated",
        message: draftsCleared
          ? `"${values.title}" has been modified`
          : "Sheet saved. Some drafts could not be cleared; copy any newer draft before resetting it.",
      });
    } catch (error) {
      showFailureToast(error, { title: "Failed to update cheatsheet" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={isSubmitting || !(titleReady && contentReady && tagsReady && descriptionReady)}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Custom Cheatsheet" onSubmit={handleSubmit} icon={Icon.Document} />
          <Action
            title="Reset Draft"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={async () => {
              if (
                !(await confirmAlert({
                  title: "Discard Saved Draft?",
                  message: "This removes the saved draft for this form.",
                  primaryAction: { title: "Discard", style: Alert.ActionStyle.Destructive },
                }))
              )
                return;
              const draftsCleared = (
                await Promise.all([clearTitleDraft(), clearContentDraft(), clearTagsDraft(), clearDescriptionDraft()])
              ).every(Boolean);
              if (draftsCleared) showToast({ style: Toast.Style.Success, title: "Draft Cleared" });
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

const CreateCustomSheetForm = CreateCustomCheatsheet;

// Repository cheatsheet view component
function RepositorySheetView({ sheet }: { sheet: RepositoryCheatsheet }) {
  const [isLoading] = useState(false);
  const [repository, setRepository] = useState<{ owner: string; name: string; defaultBranch: string } | null>(null);

  useEffect(() => {
    // Record view for repository sheet
    Service.recordView("repository", sheet.id, sheet.title).catch((error) =>
      showFailureToast(error, { title: "Could Not Save View History" }),
    );

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
        showFailureToast(err, { title: "Could Not Load Repository Details" });
      }
    };

    fetchRepository();
  }, [sheet.repositoryId]);

  const processedContent = displayMarkdown(sheet.content);

  // Construct GitHub URLs
  const githubUrl = repository
    ? `https://github.com/${repository.owner}/${repository.name}/blob/${encodeURIComponent(sheet.revision || repository.defaultBranch)}/${sheet.filePath.split("/").map(encodeURIComponent).join("/")}`
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
            <Action.CopyToClipboard title="Copy Original Markdown" content={sheet.content} icon={Icon.CopyClipboard} />
            <Action.CopyToClipboard title="Copy Title" content={sheet.title} icon={Icon.CopyClipboard} />
            <Action.Push
              title="Search Within Sheet"
              icon={Icon.MagnifyingGlass}
              shortcut={shortcut("f")}
              target={<SearchSections title={sheet.title} source={sheet.content} />}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export { EditCustomSheetForm, CustomSheetView, SheetView, RepositorySheetView };
export default Command;
