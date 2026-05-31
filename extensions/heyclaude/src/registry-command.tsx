import {
  Action,
  ActionPanel,
  Cache,
  Clipboard,
  Color,
  Icon,
  List,
  LocalStorage,
  PopToRootType,
  Toast,
  showHUD,
  showToast,
} from "@raycast/api";
import { useFrecencySorting } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FAVORITES_KEY,
  FEED_URL,
  absoluteDataUrl,
  buildEntrySummary,
  buildContributeEntryUrl,
  buildSuggestChangeUrl,
  categoryLabel,
  entryKey,
  filterEntriesByCategory,
  parseFavoriteKeys,
  serializeFavoriteKeys,
  sortedCategoryOptions,
  type RaycastEntry,
} from "./feed";
import {
  fetchFreshFeed,
  loadCachedFeed as loadCachedFeedFromRuntime,
  loadEntryDetail,
} from "./runtime";
import { markdownLink, withRaycastUtm } from "./links";
import { entryDetailMetadata, entrySnippetKeyword } from "./raycast-ui";

const cache = new Cache();

type RegistryCommandOptions = {
  fixedCategory?: string;
  searchPlaceholder?: string;
};

const categoryIcons: Record<string, Icon> = {
  agents: Icon.Person,
  mcp: Icon.Network,
  tools: Icon.AppWindow,
  skills: Icon.Hammer,
  rules: Icon.TextDocument,
  commands: Icon.Terminal,
  hooks: Icon.Bolt,
  guides: Icon.Book,
  collections: Icon.Folder,
  statuslines: Icon.BarChart,
};

function raycastEntryIcon(entry: RaycastEntry, feedUrl: string) {
  const brandIconUrl = String(entry.brandIconUrl || "").trim();
  return brandIconUrl
    ? { source: absoluteDataUrl(brandIconUrl, feedUrl) }
    : (categoryIcons[entry.category] ?? Icon.Document);
}

function getConfiguredFeed() {
  return { feedUrl: FEED_URL };
}

function loadCachedFeed(feedUrl: string) {
  return loadCachedFeedFromRuntime(cache, feedUrl);
}

async function loadFavorites() {
  const raw = await LocalStorage.getItem<string>(FAVORITES_KEY);
  if (!raw) return new Set<string>();

  try {
    return new Set(parseFavoriteKeys(raw));
  } catch {
    await LocalStorage.removeItem(FAVORITES_KEY);
    return new Set<string>();
  }
}

async function persistFavorites(favorites: Set<string>) {
  await LocalStorage.setItem(FAVORITES_KEY, serializeFavoriteKeys(favorites));
}

function metadataAccessories(entry: RaycastEntry, isFavorite: boolean) {
  const accessories: List.Item.Accessory[] = [];

  if (isFavorite) {
    accessories.push({
      icon: { source: Icon.Star, tintColor: Color.Yellow },
    });
  }
  if (entry.downloadTrust === "first-party") {
    accessories.push({
      icon: { source: Icon.CheckCircle, tintColor: Color.Green },
    });
  }

  return accessories;
}

function fixedCategoryOptions(category: string) {
  return [
    { value: "all", title: `All ${categoryLabel(category)}` },
    { value: "favorites", title: "Favorites" },
  ];
}

function filterRegistryEntries(
  entries: RaycastEntry[],
  filter: string,
  favorites: Set<string>,
  fixedCategory?: string,
) {
  if (!fixedCategory)
    return filterEntriesByCategory(entries, filter, favorites);

  const categoryEntries = entries.filter(
    (entry) => entry.category === fixedCategory,
  );
  if (filter === "favorites") {
    return categoryEntries.filter((entry) => favorites.has(entryKey(entry)));
  }
  return categoryEntries;
}

export function createRegistryCommand(options: RegistryCommandOptions = {}) {
  return function RegistryCommand() {
    const configuredFeed = getConfiguredFeed();
    const cachedFeed = loadCachedFeed(configuredFeed.feedUrl);
    const [entries, setEntries] = useState<RaycastEntry[]>(cachedFeed.entries);
    const [generatedAt, setGeneratedAt] = useState(cachedFeed.generatedAt);
    const [isLoading, setIsLoading] = useState(entries.length === 0);
    const [filter, setFilter] = useState("all");
    const [favorites, setFavorites] = useState<Set<string>>(new Set());
    const entriesCountRef = useRef(entries.length);

    useEffect(() => {
      entriesCountRef.current = entries.length;
    }, [entries.length]);

    async function refreshEntries(showSuccess = false) {
      setIsLoading(true);
      try {
        const nextFeed = await fetchFreshFeed({
          cache,
          feedUrl: configuredFeed.feedUrl,
        });
        entriesCountRef.current = nextFeed.entries.length;
        setEntries(nextFeed.entries);
        setGeneratedAt(nextFeed.generatedAt);
        if (showSuccess) {
          await showToast({
            style: Toast.Style.Success,
            title: "HeyClaude feed refreshed",
            message: `${nextFeed.entries.length} entries`,
          });
        }
      } catch (error) {
        if (entriesCountRef.current === 0) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Could not load HeyClaude",
            message:
              error instanceof Error ? error.message : "Unknown feed error",
          });
        } else if (showSuccess) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Could not refresh feed",
            message:
              error instanceof Error ? error.message : "Unknown feed error",
          });
        }
      } finally {
        setIsLoading(false);
      }
    }

    useEffect(() => {
      void refreshEntries(false);
      // Run only once on command open. Manual refresh is exposed as an action.
    }, []);

    useEffect(() => {
      let cancelled = false;

      async function initializeFavorites() {
        const loaded = await loadFavorites();
        if (!cancelled) setFavorites(loaded);
      }

      void initializeFavorites();
      return () => {
        cancelled = true;
      };
    }, []);

    const categoryOptions = useMemo(
      () =>
        options.fixedCategory
          ? fixedCategoryOptions(options.fixedCategory)
          : sortedCategoryOptions(entries),
      [entries],
    );
    const displayedEntries = useMemo(
      () =>
        filterRegistryEntries(
          entries,
          filter,
          favorites,
          options.fixedCategory,
        ),
      [filter, entries, favorites],
    );
    const {
      data: rankedEntries,
      visitItem,
      resetRanking,
    } = useFrecencySorting(displayedEntries, {
      namespace: `registry:${options.fixedCategory || "all"}`,
      key: entryKey,
    });

    async function copyFullAsset(entry: RaycastEntry) {
      try {
        const detail = await loadEntryDetail({
          entry,
          cache,
          feedUrl: configuredFeed.feedUrl,
        });
        await Clipboard.copy(detail.copyText || entry.copyText);
        await visitItem(entry);
        await showHUD(`Copied ${entry.title}`, {
          popToRootType: PopToRootType.Immediate,
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not copy full asset",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    async function pasteFullAsset(entry: RaycastEntry) {
      try {
        const detail = await loadEntryDetail({
          entry,
          cache,
          feedUrl: configuredFeed.feedUrl,
        });
        await Clipboard.paste(detail.copyText || entry.copyText);
        await visitItem(entry);
        await showHUD(`Pasted ${entry.title}`, {
          popToRootType: PopToRootType.Immediate,
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not paste full asset",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    async function toggleFavorite(entry: RaycastEntry) {
      const key = entryKey(entry);
      const next = new Set(favorites);
      const isFavorite = next.has(key);

      if (isFavorite) {
        next.delete(key);
      } else {
        next.add(key);
      }

      setFavorites(next);
      await persistFavorites(next);
      await visitItem(entry);
      await showToast({
        style: Toast.Style.Success,
        title: isFavorite ? "Removed favorite" : "Added favorite",
        message: entry.title,
      });
    }

    const emptyTitle =
      filter === "favorites"
        ? "No favorites yet"
        : options.fixedCategory
          ? `No ${categoryLabel(options.fixedCategory).toLowerCase()} found`
          : "No entries found";
    const emptyDescription =
      filter === "favorites"
        ? "Add favorites from any category to keep them here."
        : "Try another query or filter.";

    return (
      <List
        isLoading={isLoading}
        isShowingDetail
        searchBarPlaceholder={
          options.searchPlaceholder ||
          "Search Claude agents, MCP servers, skills, hooks..."
        }
        searchBarAccessory={
          <List.Dropdown
            tooltip="Filter entries"
            value={filter}
            onChange={setFilter}
          >
            {categoryOptions.map((option) => (
              <List.Dropdown.Item
                key={option.value}
                value={option.value}
                title={option.title}
              />
            ))}
          </List.Dropdown>
        }
      >
        {rankedEntries.map((entry) => {
          const isFavorite = favorites.has(entryKey(entry));
          const hasInstallCommand = Boolean(entry.installCommand.trim());
          const hasConfig = Boolean(entry.configSnippet.trim());
          const sourceUrl = entry.repoUrl || entry.documentationUrl;
          const webUrl = withRaycastUtm(entry.webUrl, "registry-entry");

          return (
            <List.Item
              key={entryKey(entry)}
              title={entry.title}
              subtitle={categoryLabel(entry.category)}
              keywords={[
                entry.category,
                categoryLabel(entry.category),
                entry.brandName || "",
                entry.brandDomain || "",
                ...entry.tags,
              ].filter(Boolean)}
              icon={raycastEntryIcon(entry, configuredFeed.feedUrl)}
              accessories={metadataAccessories(entry, isFavorite)}
              detail={
                <List.Item.Detail
                  markdown={entry.detailMarkdown}
                  metadata={entryDetailMetadata(entry, generatedAt)}
                />
              }
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Use">
                    <Action
                      title="Copy Full Asset"
                      icon={Icon.Clipboard}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                      onAction={() => void copyFullAsset(entry)}
                    />
                    <Action
                      title="Paste Full Asset"
                      icon={Icon.TextCursor}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
                      onAction={() => void pasteFullAsset(entry)}
                    />
                    {hasInstallCommand ? (
                      <Action.CopyToClipboard
                        title="Copy Install Command"
                        content={entry.installCommand}
                        shortcut={{ modifiers: ["cmd"], key: "i" }}
                        onCopy={() => void visitItem(entry)}
                      />
                    ) : null}
                    {hasConfig ? (
                      <Action.CopyToClipboard
                        title="Copy Config"
                        content={entry.configSnippet}
                        shortcut={{ modifiers: ["cmd"], key: "." }}
                        onCopy={() => void visitItem(entry)}
                      />
                    ) : null}
                    <Action.OpenInBrowser
                      title="Open on HeyClaude"
                      url={webUrl}
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                      onOpen={() => void visitItem(entry)}
                    />
                    {entry.documentationUrl ? (
                      <Action.OpenInBrowser
                        title="Open Documentation"
                        url={entry.documentationUrl}
                        onOpen={() => void visitItem(entry)}
                      />
                    ) : null}
                    {sourceUrl ? (
                      <Action.OpenInBrowser
                        title="Open Source"
                        url={sourceUrl}
                        onOpen={() => void visitItem(entry)}
                      />
                    ) : null}
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Share">
                    <Action.CopyToClipboard
                      title="Copy Canonical URL"
                      content={entry.webUrl}
                      onCopy={() => void visitItem(entry)}
                    />
                    <Action.CopyToClipboard
                      title="Copy Markdown Link"
                      content={markdownLink(entry.title, entry.webUrl)}
                      onCopy={() => void visitItem(entry)}
                    />
                    <Action.CopyToClipboard
                      title="Copy Summary"
                      content={buildEntrySummary(entry)}
                      onCopy={() => void visitItem(entry)}
                    />
                    {entry.brandDomain ? (
                      <Action.CopyToClipboard
                        title="Copy Brand Domain"
                        content={entry.brandDomain}
                        onCopy={() => void visitItem(entry)}
                      />
                    ) : null}
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Create">
                    <Action.CreateQuicklink
                      title="Create Entry Quicklink"
                      quicklink={{
                        name: `HeyClaude: ${entry.title}`,
                        link: webUrl,
                        icon: Icon.Link,
                      }}
                    />
                    <Action.CreateQuicklink
                      title="Create Category Quicklink"
                      quicklink={{
                        name: `HeyClaude ${categoryLabel(entry.category)}`,
                        link: withRaycastUtm(
                          `https://heyclau.de/${entry.category}`,
                          "category-quicklink",
                        ),
                        icon: categoryIcons[entry.category] ?? Icon.Link,
                      }}
                    />
                    {hasInstallCommand ? (
                      <Action.CreateSnippet
                        title="Create Install Snippet"
                        snippet={{
                          name: `${entry.title} install`,
                          text: entry.installCommand,
                          keyword: entrySnippetKeyword(entry),
                        }}
                      />
                    ) : null}
                    {hasConfig ? (
                      <Action.CreateSnippet
                        title="Create Config Snippet"
                        snippet={{
                          name: `${entry.title} config`,
                          text: entry.configSnippet,
                          keyword: `${entrySnippetKeyword(entry)}-config`.slice(
                            0,
                            40,
                          ),
                        }}
                      />
                    ) : null}
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Save">
                    <Action
                      title={isFavorite ? "Remove Favorite" : "Add Favorite"}
                      icon={isFavorite ? Icon.StarDisabled : Icon.Star}
                      shortcut={{ modifiers: ["cmd"], key: "f" }}
                      onAction={() => void toggleFavorite(entry)}
                    />
                    <Action
                      title="Reset Ranking"
                      icon={Icon.ArrowCounterClockwise}
                      onAction={() => void resetRanking(entry)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Contribute">
                    <Action.OpenInBrowser
                      title="Submit Similar Entry"
                      url={buildContributeEntryUrl({
                        category: entry.category,
                        brandName: entry.brandName,
                        brandDomain: entry.brandDomain,
                        tags: entry.tags,
                      })}
                      icon={Icon.Plus}
                    />
                    <Action.OpenInBrowser
                      title="Suggest Change"
                      url={buildSuggestChangeUrl(entry)}
                      icon={Icon.Pencil}
                    />
                    <Action.OpenInBrowser
                      title="Claim or Update Listing"
                      url={withRaycastUtm(
                        `https://heyclau.de/claim?category=${encodeURIComponent(entry.category)}&slug=${encodeURIComponent(entry.slug)}`,
                        "entry-claim",
                      )}
                      icon={Icon.Person}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Refresh">
                    <Action
                      title="Refresh Feed"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={() => void refreshEntries(true)}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
        {!isLoading && displayedEntries.length === 0 ? (
          <List.EmptyView
            icon={Icon.MagnifyingGlass}
            title={emptyTitle}
            description={emptyDescription}
            actions={
              <ActionPanel>
                <Action
                  title="Refresh Feed"
                  icon={Icon.ArrowClockwise}
                  onAction={() => void refreshEntries(true)}
                />
                <Action.OpenInBrowser
                  title="Contribute Entry"
                  url={buildContributeEntryUrl({
                    category: options.fixedCategory,
                  })}
                  icon={Icon.Plus}
                />
              </ActionPanel>
            }
          />
        ) : null}
      </List>
    );
  };
}
