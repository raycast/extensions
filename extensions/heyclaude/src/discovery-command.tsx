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
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FAVORITES_KEY,
  FEED_URL,
  absoluteDataUrl,
  attachDiscoveryEntries,
  buildContributeEntryUrl,
  buildEntrySummary,
  buildSuggestChangeUrl,
  categoryLabel,
  entryKey,
  filterDiscoveryEntries,
  parseFavoriteKeys,
  serializeFavoriteKeys,
  sortedCategoryOptions,
  type RaycastDiscoveryEntry,
  type RaycastEntry,
} from "./feed";
import {
  fetchFreshFeed,
  fetchFreshRecentUpdates,
  fetchFreshTrending,
  loadCachedFeed as loadCachedFeedFromRuntime,
  loadCachedRecentUpdates,
  loadCachedTrending,
  loadEntryDetail,
} from "./runtime";
import { markdownLink, withRaycastUtm } from "./links";
import { entryDetailMetadata, entrySnippetKeyword } from "./raycast-ui";

const cache = new Cache();

type DiscoveryCommandOptions = {
  kind: "trending" | "recent";
  title: string;
  emptyTitle: string;
  emptyDescription: string;
  searchPlaceholder: string;
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

function getConfiguredFeed() {
  return { feedUrl: FEED_URL };
}

function loadCachedFeed(feedUrl: string) {
  return loadCachedFeedFromRuntime(cache, feedUrl);
}

function loadCachedDiscovery(
  kind: DiscoveryCommandOptions["kind"],
  feedUrl: string,
) {
  return kind === "trending"
    ? loadCachedTrending(cache, feedUrl)
    : loadCachedRecentUpdates(cache, feedUrl);
}

async function fetchFreshDiscovery(
  kind: DiscoveryCommandOptions["kind"],
  feedUrl: string,
) {
  return kind === "trending"
    ? fetchFreshTrending({ cache, feedUrl })
    : fetchFreshRecentUpdates({ cache, feedUrl });
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

function raycastEntryIcon(entry: RaycastEntry, feedUrl: string) {
  const brandIconUrl = String(entry.brandIconUrl || "").trim();
  return brandIconUrl
    ? { source: absoluteDataUrl(brandIconUrl, feedUrl) }
    : (categoryIcons[entry.category] ?? Icon.Document);
}

function updateKindLabel(value?: string) {
  switch (value) {
    case "added":
      return "Added";
    case "updated":
      return "Updated";
    case "removed":
      return "Removed";
    case "upstream_update":
      return "Upstream update";
    default:
      return "Update";
  }
}

function reasonLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function discoveryBadge(entry: RaycastDiscoveryEntry) {
  if (typeof entry.discovery.score === "number") {
    return `Score ${Math.round(entry.discovery.score)}`;
  }
  return updateKindLabel(entry.discovery.updateKind);
}

function discoveryAccessories(
  entry: RaycastDiscoveryEntry,
  isFavorite: boolean,
): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  if (isFavorite) {
    accessories.push({
      icon: { source: Icon.Star, tintColor: Color.Yellow },
    });
  }
  accessories.push({ text: discoveryBadge(entry) });
  if (entry.downloadTrust === "first-party") {
    accessories.push({
      icon: { source: Icon.CheckCircle, tintColor: Color.Green },
    });
  }

  return accessories;
}

function buildDiscoverySummary(entry: RaycastDiscoveryEntry) {
  const reasons = entry.discovery.reasons.map(reasonLabel).join(", ");
  return [
    buildEntrySummary(entry),
    reasons ? `Reasons: ${reasons}` : "",
    entry.discovery.updatedAt ? `Updated: ${entry.discovery.updatedAt}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function discoveryMarkdown(entry: RaycastDiscoveryEntry, kind: string) {
  const lines = [
    kind === "trending" ? "## Trending signal" : "## Recent update",
    `- ${discoveryBadge(entry)}`,
    entry.discovery.updatedAt ? `- Updated: ${entry.discovery.updatedAt}` : "",
    entry.discovery.reasons.length
      ? `- Reasons: ${entry.discovery.reasons.map(reasonLabel).join(", ")}`
      : "",
    "",
    entry.detailMarkdown,
  ];
  return lines.filter((line) => line !== "").join("\n");
}

function favoriteFilterOptions(entries: RaycastDiscoveryEntry[]) {
  return sortedCategoryOptions(entries);
}

export function createDiscoveryCommand(options: DiscoveryCommandOptions) {
  return function DiscoveryCommand() {
    const configuredFeed = getConfiguredFeed();
    const cachedFeed = loadCachedFeed(configuredFeed.feedUrl);
    const cachedDiscovery = loadCachedDiscovery(
      options.kind,
      configuredFeed.feedUrl,
    );
    const [entries, setEntries] = useState<RaycastEntry[]>(cachedFeed.entries);
    const [references, setReferences] = useState(cachedDiscovery.entries);
    const [generatedAt, setGeneratedAt] = useState(
      cachedDiscovery.generatedAt || cachedFeed.generatedAt,
    );
    const [isLoading, setIsLoading] = useState(
      entries.length === 0 || references.length === 0,
    );
    const [filter, setFilter] = useState("all");
    const [favorites, setFavorites] = useState<Set<string>>(new Set());
    const entriesCountRef = useRef(entries.length);

    useEffect(() => {
      entriesCountRef.current = entries.length;
    }, [entries.length]);

    async function refreshEntries(showSuccess = false) {
      setIsLoading(true);
      try {
        const [nextFeed, nextDiscovery] = await Promise.all([
          fetchFreshFeed({ cache, feedUrl: configuredFeed.feedUrl }),
          fetchFreshDiscovery(options.kind, configuredFeed.feedUrl),
        ]);
        entriesCountRef.current = nextFeed.entries.length;
        setEntries(nextFeed.entries);
        setReferences(nextDiscovery.entries);
        setGeneratedAt(nextDiscovery.generatedAt || nextFeed.generatedAt);

        if (showSuccess) {
          const stale =
            nextFeed.refreshStatus === "stale" ||
            nextDiscovery.refreshStatus === "stale";
          await showToast({
            style: stale ? Toast.Style.Failure : Toast.Style.Success,
            title: stale
              ? `Could not fully refresh ${options.title}`
              : `${options.title} refreshed`,
            message: stale
              ? nextFeed.refreshWarning || nextDiscovery.refreshWarning
              : `${nextDiscovery.entries.length} entries`,
          });
        }
      } catch (error) {
        if (entriesCountRef.current === 0 || showSuccess) {
          await showToast({
            style: Toast.Style.Failure,
            title: showSuccess
              ? `Could not refresh ${options.title}`
              : `Could not load ${options.title}`,
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

    const discoveryEntries = useMemo(
      () =>
        attachDiscoveryEntries(entries, references, {
          fallbackForRemoved: options.kind === "recent",
        }),
      [entries, references],
    );
    const categoryOptions = useMemo(
      () => favoriteFilterOptions(discoveryEntries),
      [discoveryEntries],
    );
    const displayedEntries = useMemo(
      () => filterDiscoveryEntries(discoveryEntries, filter, favorites),
      [discoveryEntries, favorites, filter],
    );

    async function copyFullAsset(entry: RaycastDiscoveryEntry) {
      try {
        const detail = await loadEntryDetail({
          entry,
          cache,
          feedUrl: configuredFeed.feedUrl,
        });
        await Clipboard.copy(detail.copyText || entry.copyText);
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

    async function pasteFullAsset(entry: RaycastDiscoveryEntry) {
      try {
        const detail = await loadEntryDetail({
          entry,
          cache,
          feedUrl: configuredFeed.feedUrl,
        });
        await Clipboard.paste(detail.copyText || entry.copyText);
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

    async function toggleFavorite(entry: RaycastDiscoveryEntry) {
      const key = entryKey(entry);
      const next = new Set(favorites);
      const isFavorite = next.has(key);

      if (isFavorite) next.delete(key);
      else next.add(key);

      setFavorites(next);
      await persistFavorites(next);
      await showToast({
        style: Toast.Style.Success,
        title: isFavorite ? "Removed favorite" : "Added favorite",
        message: entry.title,
      });
    }

    const emptyTitle =
      filter === "favorites" ? "No favorites yet" : options.emptyTitle;
    const emptyDescription =
      filter === "favorites"
        ? "Add favorites from any registry command to keep them here."
        : options.emptyDescription;

    return (
      <List
        isLoading={isLoading}
        isShowingDetail
        searchBarPlaceholder={options.searchPlaceholder}
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
        {displayedEntries.map((entry) => {
          const isFavorite = favorites.has(entryKey(entry));
          const hasInstallCommand = Boolean(entry.installCommand.trim());
          const hasConfig = Boolean(entry.configSnippet.trim());
          const webUrl = withRaycastUtm(entry.webUrl, options.kind);

          return (
            <List.Item
              key={`${options.kind}:${entryKey(entry)}`}
              title={entry.title}
              subtitle={categoryLabel(entry.category)}
              keywords={[
                entry.category,
                categoryLabel(entry.category),
                entry.brandName || "",
                entry.brandDomain || "",
                entry.discovery.updateKind || "",
                ...entry.discovery.reasons,
                ...entry.tags,
              ].filter(Boolean)}
              icon={raycastEntryIcon(entry, configuredFeed.feedUrl)}
              accessories={discoveryAccessories(entry, isFavorite)}
              detail={
                <List.Item.Detail
                  markdown={discoveryMarkdown(entry, options.kind)}
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
                      />
                    ) : null}
                    {hasConfig ? (
                      <Action.CopyToClipboard
                        title="Copy Config"
                        content={entry.configSnippet}
                        shortcut={{ modifiers: ["cmd"], key: "." }}
                      />
                    ) : null}
                    <Action.OpenInBrowser
                      title="Open on HeyClaude"
                      url={webUrl}
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                    />
                    {entry.documentationUrl ? (
                      <Action.OpenInBrowser
                        title="Open Documentation"
                        url={entry.documentationUrl}
                      />
                    ) : null}
                    {entry.repoUrl ? (
                      <Action.OpenInBrowser
                        title="Open Source"
                        url={entry.repoUrl}
                      />
                    ) : null}
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Share">
                    <Action.CopyToClipboard
                      title="Copy Discovery Summary"
                      content={buildDiscoverySummary(entry)}
                    />
                    <Action.CopyToClipboard
                      title="Copy Canonical URL"
                      content={entry.webUrl}
                    />
                    <Action.CopyToClipboard
                      title="Copy Markdown Link"
                      content={markdownLink(entry.title, entry.webUrl)}
                    />
                    {entry.brandDomain ? (
                      <Action.CopyToClipboard
                        title="Copy Brand Domain"
                        content={entry.brandDomain}
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
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Refresh">
                    <Action
                      title={`Refresh ${options.title}`}
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
            icon={options.kind === "trending" ? Icon.BarChart : Icon.Clock}
            title={emptyTitle}
            description={emptyDescription}
            actions={
              <ActionPanel>
                <Action
                  title={`Refresh ${options.title}`}
                  icon={Icon.ArrowClockwise}
                  onAction={() => void refreshEntries(true)}
                />
              </ActionPanel>
            }
          />
        ) : null}
      </List>
    );
  };
}
