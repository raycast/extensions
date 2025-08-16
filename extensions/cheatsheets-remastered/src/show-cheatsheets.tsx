import React from 'react';
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
} from '@raycast/api';
import { useEffect, useState } from 'react';
import { useFrecencySorting } from '@raycast/utils';

import Service, {
  CustomCheatsheet,
  OfflineCheatsheet,
  FavoriteCheatsheet,
} from './service';
import type { File as ServiceFile } from './service';
import { stripFrontmatter, stripTemplateTags, formatTables } from './utils';

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

type FilterType = 'all' | 'custom' | 'default';

interface UnifiedCheatsheet {
  id: string;
  type: 'custom' | 'default';
  slug: string;
  title: string;
  isOffline: boolean;
  isFavorited: boolean;
}

function Command() {
  const [sheets, setSheets] = useState<string[]>([]);
  const [customSheets, setCustomSheets] = useState<CustomCheatsheet[]>([]);
  const [offlineSheets, setOfflineSheets] = useState<OfflineCheatsheet[]>([]);
  const [favorites, setFavorites] = useState<FavoriteCheatsheet[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<
    'frecency' | 'lastViewed' | 'mostViewed' | 'alpha'
  >('frecency');
  const [viewStats, setViewStats] = useState<
    Record<string, { count: number; lastViewedAt: number }>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    // Trigger background offline update if preferences allow
    Service.updateOfflineIfNeeded();
  }, []);

  async function loadData() {
    try {
      setIsLoading(true);
      setError(null);

      // Always try to fetch fresh data from online sources by default
      const [files, custom, offline, favs] = await Promise.all([
        Service.listFiles(),
        Service.getCustomCheatsheets(),
        Service.getOfflineCheatsheets(),
        Service.getFavorites(),
      ]);

      if (files.length > 0) {
        const sheets = getSheets(files);
        setSheets(sheets);
      } else if (
        offline.length > 0 &&
        Service.getPreferences().enableOfflineStorage
      ) {
        // Only use offline data if no fresh data available AND offline storage is enabled
        const offlineSlugs = offline.map((sheet) => sheet.slug);
        setSheets(offlineSlugs);
      }

      setCustomSheets(custom);
      setOfflineSheets(offline);
      setFavorites(favs);
      setViewStats(await Service.getViewStatsMap());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load cheatsheets',
      );
      showToast({
        style: Toast.Style.Failure,
        title: 'Error',
        message: 'Failed to load cheatsheets',
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Create unified cheatsheet list
  const createUnifiedList = (): UnifiedCheatsheet[] => {
    const unified: UnifiedCheatsheet[] = [];

    // Add custom cheatsheets
    customSheets.forEach((sheet) => {
      unified.push({
        id: sheet.id,
        type: 'custom',
        slug: sheet.id,
        title: sheet.title,
        isOffline: true, // Custom sheets are always "offline"
        isFavorited: favorites.some(
          (fav) => fav.slug === sheet.id && fav.type === 'custom',
        ),
      });
    });

    // Add online cheatsheets
    sheets.forEach((sheet) => {
      const isOffline = offlineSheets.some((offline) => offline.slug === sheet);
      unified.push({
        id: sheet,
        type: 'default',
        slug: sheet,
        title: sheet,
        isOffline,
        isFavorited: favorites.some(
          (fav) => fav.slug === sheet && fav.type === 'default',
        ),
      });
    });

    return unified;
  };

  const unifiedList = createUnifiedList();

  // Apply frequency sorting
  const { data: frecencyData } = useFrecencySorting(unifiedList, {
    namespace: 'cheatsheets',
    key: (item) => `${item.type}-${item.slug}`,
    sortUnvisited: (a, b) => {
      // Sort unvisited items: favorites first, then by type (custom first), then alphabetically
      if (a.isFavorited && !b.isFavorited) return -1;
      if (!a.isFavorited && b.isFavorited) return 1;
      if (a.type === 'custom' && b.type === 'default') return -1;
      if (a.type === 'default' && b.type === 'custom') return 1;
      return a.title.localeCompare(b.title);
    },
  });

  // User sorting options using view stats
  const sortedData = [...frecencyData].sort((a, b) => {
    if (sort === 'alpha') return a.title.localeCompare(b.title);
    const aKey = `${a.type}-${a.slug}`;
    const bKey = `${b.type}-${b.slug}`;
    const aStats = viewStats[aKey];
    const bStats = viewStats[bKey];
    if (sort === 'lastViewed')
      return (bStats?.lastViewedAt || 0) - (aStats?.lastViewedAt || 0);
    if (sort === 'mostViewed')
      return (bStats?.count || 0) - (aStats?.count || 0);
    return 0; // frecency default order
  });

  // Filter the sorted data
  const filteredData = sortedData.filter((item) => {
    switch (filter) {
      case 'custom':
        return item.type === 'custom';
      case 'default':
        return item.type === 'default';
      default:
        return true;
    }
  });

  // Build recent list (top 3: prefer lastViewed, fallback to mostViewed if none)
  let recentItems = [...filteredData]
    .sort((a, b) => {
      const aKey = `${a.type}-${a.slug}`;
      const bKey = `${b.type}-${b.slug}`;
      return (
        (viewStats[bKey]?.lastViewedAt || 0) -
        (viewStats[aKey]?.lastViewedAt || 0)
      );
    })
    .filter((item) => !!viewStats[`${item.type}-${item.slug}`]?.lastViewedAt)
    .slice(0, 3);
  if (recentItems.length === 0) {
    recentItems = [...filteredData]
      .sort((a, b) => {
        const aKey = `${a.type}-${a.slug}`;
        const bKey = `${b.type}-${b.slug}`;
        return (viewStats[bKey]?.count || 0) - (viewStats[aKey]?.count || 0);
      })
      .filter(
        (item) => (viewStats[`${item.type}-${item.slug}`]?.count || 0) > 0,
      )
      .slice(0, 3);
  }

  async function handleDeleteCustomSheet(id: string, title: string) {
    const confirmed = await confirmAlert({
      title: 'Delete Custom Cheatsheet',
      message: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      primaryAction: {
        title: 'Delete',
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
          title: 'Deleted',
          message: `"${title}" has been removed`,
        });
      } catch (err) {
        showToast({
          style: Toast.Style.Failure,
          title: 'Error',
          message: 'Failed to delete cheatsheet',
        });
      }
    }
  }

  async function handleRefresh() {
    await loadData();
    showToast({
      style: Toast.Style.Success,
      title: 'Refreshed',
      message: 'Cheatsheets updated',
    });
  }

  async function handleToggleFavorite(item: UnifiedCheatsheet) {
    try {
      const newFavorited = await Service.toggleFavorite(
        item.type,
        item.slug,
        item.title,
      );

      // Update local state
      const updatedFavorites = await Service.getFavorites();
      setFavorites(updatedFavorites);

      // Update the item's favorite status
      item.isFavorited = newFavorited;

      showToast({
        style: Toast.Style.Success,
        title: newFavorited ? 'Added to Favorites' : 'Removed from Favorites',
        message: `"${item.title}" ${newFavorited ? 'is now' : 'is no longer'} favorited`,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Error',
        message: 'Failed to update favorite status',
      });
    }
  }

  async function handleDownloadForOffline(slug: string) {
    try {
      const content = await Service.getSheet(slug);
      await Service.saveOfflineCheatsheet(slug, content);
      showToast({
        style: Toast.Style.Success,
        title: 'Downloaded',
        message: `${slug} is now available offline`,
      });
      // Reload offline data
      const updated = await Service.getOfflineCheatsheets();
      setOfflineSheets(updated);
      // Reload unified list
      await loadData();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Download Failed',
        message: `Failed to download ${slug}`,
      });
    }
  }

  if (error) {
    return (
      <Detail
        markdown={`# Error Loading Cheatsheets\n\n${error}\n\nPlease try refreshing or check your internet connection.`}
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              onAction={loadData}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={handleRefresh}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search cheatsheets..."
      searchBarAccessory={
        <>
          <List.Dropdown
            tooltip="Filter"
            value={filter}
            onChange={(value) => setFilter(value as FilterType)}
          >
            <List.Dropdown.Item title="All" value="all" />
            <List.Dropdown.Item title="Custom" value="custom" />
            <List.Dropdown.Item title="Default" value="default" />
          </List.Dropdown>
          <List.Dropdown
            tooltip="Sort"
            value={sort}
            onChange={(value) =>
              setSort(
                value as 'frecency' | 'lastViewed' | 'mostViewed' | 'alpha',
              )
            }
          >
            <List.Dropdown.Item title="Frecency" value="frecency" />
            <List.Dropdown.Item title="Last Viewed" value="lastViewed" />
            <List.Dropdown.Item title="Most Viewed" value="mostViewed" />
            <List.Dropdown.Item title="Alphabetical" value="alpha" />
          </List.Dropdown>
        </>
      }
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={handleRefresh}
          />
          <Action.Push
            title="Create Custom Cheatsheet"
            icon={Icon.Plus}
            shortcut={{ modifiers: ['cmd'], key: 'n' }}
            target={
              <CreateCustomSheetForm
                onCreated={async () => {
                  const updated = await Service.getCustomCheatsheets();
                  setCustomSheets(updated);
                }}
              />
            }
          />
          {Service.getPreferences().enableOfflineStorage && (
            <>
              <Action
                title="Download All for Offline"
                icon={Icon.Download}
                onAction={async () => {
                  try {
                    await Service.downloadAllForOffline();
                    await loadData();
                  } catch (error) {
                    // Error already shown by service
                  }
                }}
              />
            </>
          )}
        </ActionPanel>
      }
    >
      <List.Section
        title="Overview"
        subtitle={`${filteredData.length} items • ${filter} • ${sort}`}
      />
      {recentItems.length > 0 && (
        <List.Section
          title="Recently Viewed"
          subtitle={`${recentItems.length} items`}
        >
          {recentItems.map((item) => (
            <List.Item
              key={`recent-${item.id}`}
              title={item.title}
              subtitle={`${item.type === 'custom' ? 'Custom' : 'Default'}`}
              icon={
                item.type === 'custom'
                  ? customSheets.find((s) => s.id === item.id)?.iconKey
                    ? Service.iconForKey(
                        customSheets.find((s) => s.id === item.id)!.iconKey!,
                      )
                    : Icon.Document
                  : Service.resolveIconForSlug(item.slug)
              }
              accessories={[{ text: 'Recent', icon: Icon.Clock }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Open Cheatsheet"
                    icon={Icon.Window}
                    target={
                      item.type === 'custom' ? (
                        <CustomSheetView
                          sheet={customSheets.find((s) => s.id === item.id)!}
                        />
                      ) : (
                        <SheetView slug={item.slug} />
                      )
                    }
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {filteredData.map((item) => (
        <List.Item
          key={item.id}
          title={item.title}
          subtitle={
            item.type === 'custom'
              ? customSheets.find((s) => s.id === item.id)?.description ||
                'Custom'
              : Service.getDefaultMetadata(item.slug)?.description ||
                (Service.isLocalCheatsheet(item.slug) ? 'Local' : 'Default')
          }
          icon={
            item.type === 'custom'
              ? customSheets.find((s) => s.id === item.id)?.iconKey
                ? Service.iconForKey(
                    customSheets.find((s) => s.id === item.id)!.iconKey!,
                  )
                : Icon.Document
              : Service.resolveIconForSlug(item.slug)
          }
          keywords={
            item.type === 'custom'
              ? customSheets.find((s) => s.id === item.id)?.tags || []
              : Service.getDefaultMetadata(item.slug)?.tags || []
          }
          accessories={[
            {
              text:
                item.type === 'custom'
                  ? 'Custom'
                  : Service.isLocalCheatsheet(item.slug)
                    ? 'Local'
                    : 'Default',
              icon:
                item.type === 'custom'
                  ? Icon.Tag
                  : Service.isLocalCheatsheet(item.slug)
                    ? Icon.Document
                    : Icon.Globe,
            },
            ...(item.type === 'custom'
              ? (customSheets.find((s) => s.id === item.id)?.tags || [])
                  .slice(0, 3)
                  .map((t) => ({ text: t }))
              : (Service.getDefaultMetadata(item.slug)?.tags || [])
                  .slice(0, 3)
                  .map((t) => ({ text: t }))),
            ...(item.isOffline
              ? [{ icon: Icon.Checkmark, tooltip: 'Available Offline' }]
              : []),
            ...(item.isFavorited
              ? [{ icon: Icon.Star, tooltip: 'Favorited' }]
              : []),
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="View">
                <Action.Push
                  title="Open Cheatsheet"
                  icon={Icon.Window}
                  target={
                    item.type === 'custom' ? (
                      <CustomSheetView
                        sheet={customSheets.find((s) => s.id === item.id)!}
                      />
                    ) : (
                      <SheetView slug={item.slug} />
                    )
                  }
                  onPush={async () => {
                    await Service.recordView(item.type, item.slug, item.title);
                    const stats = await Service.getViewStatsMap();
                    setViewStats(stats);
                  }}
                />
                {item.type === 'default' && (
                  <Action.OpenInBrowser
                    url={Service.urlFor(item.slug)}
                    title="Open in Browser"
                    icon={Icon.Link}
                  />
                )}
              </ActionPanel.Section>
              <ActionPanel.Section title="Actions">
                <Action
                  title={
                    item.isFavorited
                      ? 'Remove from Favorites'
                      : 'Add to Favorites'
                  }
                  icon={item.isFavorited ? Icon.StarDisabled : Icon.Star}
                  onAction={() => handleToggleFavorite(item)}
                  shortcut={{ modifiers: ['cmd'], key: 'f' }}
                />
                <Action.CopyToClipboard
                  title="Copy Title"
                  content={item.title}
                  icon={Icon.CopyClipboard}
                />
                {item.type === 'default' && (
                  <Action
                    title="Copy Full Content"
                    icon={Icon.CopyClipboard}
                    shortcut={{ modifiers: ['cmd'], key: 'c' }}
                    onAction={async () => {
                      const content = await Service.getSheet(item.slug);
                      await Clipboard.copy(content);
                      showToast({
                        style: Toast.Style.Success,
                        title: 'Copied',
                        message: 'Full sheet copied',
                      });
                    }}
                  />
                )}
                {item.type === 'custom' && (
                  <Action
                    title="Copy Full Content"
                    icon={Icon.CopyClipboard}
                    shortcut={{ modifiers: ['cmd'], key: 'c' }}
                    onAction={async () => {
                      const sheet = customSheets.find((s) => s.id === item.id);
                      if (sheet) {
                        await Clipboard.copy(sheet.content);
                        showToast({
                          style: Toast.Style.Success,
                          title: 'Copied',
                          message: 'Full sheet copied',
                        });
                      }
                    }}
                  />
                )}
                {item.type === 'custom' && (
                  <Action.Push
                    title="Edit Custom Cheatsheet"
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ['cmd'], key: 'e' }}
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
                {item.type === 'default' &&
                  Service.getPreferences().enableOfflineStorage && (
                    <Action
                      title={
                        item.isOffline
                          ? 'Update Offline Copy'
                          : 'Download for Offline'
                      }
                      icon={
                        item.isOffline ? Icon.ArrowClockwise : Icon.Download
                      }
                      onAction={() => handleDownloadForOffline(item.slug)}
                    />
                  )}
              </ActionPanel.Section>
              {item.type === 'custom' && (
                <ActionPanel.Section title="Danger Zone">
                  <Action
                    title="Delete Custom Cheatsheet"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() =>
                      handleDeleteCustomSheet(item.id, item.title)
                    }
                  />
                </ActionPanel.Section>
              )}
            </ActionPanel>
          }
        />
      ))}

      <List.Item
        title="Create New Custom Cheatsheet"
        subtitle="Add your own cheatsheet"
        icon={Icon.Plus}
        accessories={[{ text: 'New', icon: Icon.Star }]}
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
    </List>
  );
}

// Helper function to get sheets from files
function getSheets(files: ServiceFile[]): string[] {
  return files
    .filter((file) => {
      const isDir = file.type === 'tree';
      const isMarkdown = file.path.endsWith('.md');
      const adminFiles = ['CONTRIBUTING', 'README', 'index', 'index@2016'];
      const isAdminFile = adminFiles.some((adminFile) =>
        file.path.startsWith(adminFile),
      );
      const inUnderscoreDir = /(^|\/)_[^/]+/.test(file.path);
      return !isDir && isMarkdown && !isAdminFile && !inUnderscoreDir;
    })
    .map((file) => file.path.replace('.md', ''));
}

interface SheetProps {
  slug: string;
}

function SheetView({ slug }: SheetProps) {
  const [content, setContent] = useState<string>('');
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
      await Service.recordView('default', slug, slug);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load cheatsheet',
      );
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
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              onAction={loadSheet}
            />
          </ActionPanel>
        }
      />
    );
  }

  const processedContent = formatTables(
    stripTemplateTags(stripFrontmatter(content)),
  );
  const isLocal = Service.isLocalCheatsheet(slug);

  return (
    <Detail
      markdown={processedContent}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Actions">
            <Action.CopyToClipboard
              title="Copy Content"
              content={processedContent}
              icon={Icon.CopyClipboard}
            />
            <Action.CopyToClipboard
              title="Copy Title"
              content={slug}
              icon={Icon.CopyClipboard}
            />
            <Action.OpenInBrowser
              url={Service.urlFor(slug)}
              title="Open in Browser"
              icon={Icon.Link}
            />
          </ActionPanel.Section>
          {isLocal && (
            <ActionPanel.Section title="About">
              <Action.OpenInBrowser
                title="Open DevHints Website"
                icon={Icon.Globe}
                url="https://devhints.io"
              />
              <Action.OpenInBrowser
                title="Open DevHints on GitHub"
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
    Service.recordView('custom', sheet.id, sheet.title);
  }, [sheet.id]);
  return (
    <Detail
      markdown={`# ${sheet.title}\n\n${sheet.content}`}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Actions">
            <Action.CopyToClipboard
              title="Copy Content"
              content={sheet.content}
              icon={Icon.CopyClipboard}
            />
            <Action.CopyToClipboard
              title="Copy Title"
              content={sheet.title}
              icon={Icon.CopyClipboard}
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
    updateValue: updateTitle,
    clearDraft: clearTitleDraft,
  } = useDraftPersistence(`edit-custom-sheet-title-${sheet.id}`, sheet.title);

  const {
    value: content,
    updateValue: updateContent,
    clearDraft: clearContentDraft,
  } = useDraftPersistence(
    `edit-custom-sheet-content-${sheet.id}`,
    sheet.content,
  );

  const {
    value: tags,
    updateValue: updateTags,
    clearDraft: clearTagsDraft,
  } = useDraftPersistence(
    `edit-custom-sheet-tags-${sheet.id}`,
    (sheet.tags || []).join(', '),
  );

  const {
    value: description,
    updateValue: updateDescription,
    clearDraft: clearDescriptionDraft,
  } = useDraftPersistence(
    `edit-custom-sheet-description-${sheet.id}`,
    sheet.description || '',
  );

  const handleSubmit = async (values: {
    title: string;
    content: string;
    tags?: string;
    description?: string;
  }) => {
    try {
      setIsSubmitting(true);
      setShowErrors(true);
      if (!values.title?.trim() || !values.content?.trim()) {
        setIsSubmitting(false);
        return;
      }

      const tagsArray = values.tags
        ? values.tags
            .split(',')
            .map((tag: string) => tag.trim())
            .filter(Boolean)
        : [];

      await Service.updateCustomCheatsheet(
        sheet.id,
        values.title,
        values.content,
        tagsArray,
        values.description,
      );

      // Clear drafts after successful submission
      clearTitleDraft();
      clearContentDraft();
      clearTagsDraft();
      clearDescriptionDraft();

      onUpdated();
      pop();

      showToast({
        style: Toast.Style.Success,
        title: 'Updated',
        message: `"${values.title}" has been modified`,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Error',
        message: 'Failed to update cheatsheet',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Update Custom Cheatsheet"
            onSubmit={handleSubmit}
            icon={Icon.Document}
          />
          <Action
            title="Reset Draft"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={() => {
              clearTitleDraft();
              clearContentDraft();
              clearTagsDraft();
              clearDescriptionDraft();
              showToast({ style: Toast.Style.Success, title: 'Draft Cleared' });
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
        error={showErrors && !title.trim() ? 'Title is required' : undefined}
      />

      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Enter cheatsheet content (Markdown supported)"
        value={content}
        onChange={updateContent}
        error={
          showErrors && !content.trim() ? 'Content is required' : undefined
        }
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
  } = useDraftPersistence('create-custom-sheet-title', '');

  const {
    value: content,
    updateValue: updateContent,
    clearDraft: clearContentDraft,
  } = useDraftPersistence('create-custom-sheet-content', '');

  const {
    value: tags,
    updateValue: updateTags,
    clearDraft: clearTagsDraft,
  } = useDraftPersistence('create-custom-sheet-tags', '');

  const {
    value: description,
    updateValue: updateDescription,
    clearDraft: clearDescriptionDraft,
  } = useDraftPersistence('create-custom-sheet-description', '');

  const handleSubmit = async (values: {
    title: string;
    content: string;
    tags?: string;
    description?: string;
  }) => {
    try {
      setIsSubmitting(true);
      setShowErrors(true);

      const tagsArray = values.tags
        ? values.tags
            .split(',')
            .map((tag: string) => tag.trim())
            .filter(Boolean)
        : [];

      await Service.createCustomCheatsheet(
        values.title,
        values.content,
        tagsArray,
        values.description,
      );

      // Clear drafts after successful submission
      clearTitleDraft();
      clearContentDraft();
      clearTagsDraft();
      clearDescriptionDraft();

      onCreated();
      pop();

      showToast({
        style: Toast.Style.Success,
        title: 'Created',
        message: `"${values.title}" has been added`,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Error',
        message: 'Failed to create cheatsheet',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Custom Cheatsheet"
            onSubmit={handleSubmit}
            icon={Icon.Document}
          />
          <Action
            title="Reset Draft"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={() => {
              clearTitleDraft();
              clearContentDraft();
              clearTagsDraft();
              clearDescriptionDraft();
              showToast({ style: Toast.Style.Success, title: 'Draft Cleared' });
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
        error={showErrors && !title.trim() ? 'Title is required' : undefined}
      />

      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Enter cheatsheet content (Markdown supported)"
        value={content}
        onChange={updateContent}
        error={
          showErrors && !content.trim() ? 'Content is required' : undefined
        }
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

export { EditCustomSheetForm, CustomSheetView, SheetView };
export default Command;
