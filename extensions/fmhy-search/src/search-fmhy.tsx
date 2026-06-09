import { Action, ActionPanel, Color, Detail, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";

import { isCachedIndexFresh, readCachedIndex, writeCachedIndex } from "./lib/cache";
import { getErrorMessage } from "./lib/errors";
import { fetchFmhyIndex } from "./lib/fmhy-api";
import { normalizeFmhyGeneratedCategoryUrl } from "./lib/fmhy-url";
import { formatResultCount, formatTimestamp } from "./lib/format";
import { searchFmhyResults } from "./lib/search";
import type {
  FmhyCategory,
  FmhyIndex,
  FmhyIndexCache,
  FmhyRelatedLink,
  FmhyRelatedLinkKind,
  FmhyResult,
} from "./lib/types";

const RESULTS_PAGE_SIZE = 100;
const UNCATEGORIZED_SECTION_TITLE = "Other";
const LOAD_MORE_ITEM_ID = "load-more-results";
const SIMPLE_ICONS_URL = "https://cdn.simpleicons.org";
const EMPTY_INDEX: FmhyIndex = { results: [], categories: [] };
const CATEGORY_NOTE_SHORTCUT: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd"], key: "n" },
  Windows: { modifiers: ["ctrl"], key: "n" },
};
const QUICK_RELATED_LINK_KINDS = new Set<FmhyRelatedLinkKind>([
  "discord",
  "github",
  "gitlab",
  "reddit",
  "telegram",
  "twitter",
]);
const RELATED_LINK_BRAND_ICONS: Partial<
  Record<FmhyRelatedLinkKind, { source: string | { light: string; dark: string }; fallback: Icon }>
> = {
  discord: { source: `${SIMPLE_ICONS_URL}/discord/5865F2`, fallback: Icon.SpeechBubble },
  github: {
    source: {
      light: `${SIMPLE_ICONS_URL}/github/181717`,
      dark: `${SIMPLE_ICONS_URL}/github/ffffff`,
    },
    fallback: Icon.Code,
  },
  gitlab: { source: `${SIMPLE_ICONS_URL}/gitlab/FC6D26`, fallback: Icon.Code },
  reddit: { source: `${SIMPLE_ICONS_URL}/reddit/FF4500`, fallback: Icon.Message },
  telegram: { source: `${SIMPLE_ICONS_URL}/telegram/26A5E4`, fallback: Icon.Message },
  twitter: {
    source: {
      light: `${SIMPLE_ICONS_URL}/x/000000`,
      dark: `${SIMPLE_ICONS_URL}/x/ffffff`,
    },
    fallback: Icon.AtSymbol,
  },
};

type IndexState = {
  index: FmhyIndex;
  isLoading: boolean;
  timestamp?: number;
  error?: string;
  isStale?: boolean;
  isLegacyCache?: boolean;
};

type ResultSection = {
  title: string;
  results: FmhyResult[];
  category?: FmhyCategory;
};

export default function Command() {
  const [state, setState] = useState<IndexState>({ index: EMPTY_INDEX, isLoading: true });
  const [searchText, setSearchText] = useState("");
  const [visibleResultLimit, setVisibleResultLimit] = useState(RESULTS_PAGE_SIZE);
  const [selectionTargetId, setSelectionTargetId] = useState<string>();

  const categoriesByName = useMemo(() => getCategoriesByName(state.index.categories), [state.index.categories]);
  const visibleResultSet = useMemo(
    () => searchFmhyResults(state.index.results, searchText, visibleResultLimit),
    [state.index.results, searchText, visibleResultLimit],
  );
  const visibleResultSections = useMemo(
    () => groupResultsByCategory(visibleResultSet.results, categoriesByName),
    [categoriesByName, visibleResultSet.results],
  );

  const loadMoreResults = useCallback(() => {
    const nextLimit = visibleResultLimit + RESULTS_PAGE_SIZE;
    const nextResults = searchFmhyResults(state.index.results, searchText, nextLimit).results;
    const firstNewResult = nextResults[visibleResultSet.results.length];

    setVisibleResultLimit(nextLimit);
    setSelectionTargetId(firstNewResult?.url);
  }, [searchText, state.index.results, visibleResultLimit, visibleResultSet.results.length]);

  const handleSearchTextChange = useCallback((text: string) => {
    setSearchText(text);
    setVisibleResultLimit(RESULTS_PAGE_SIZE);
    setSelectionTargetId(undefined);
  }, []);

  const clearSelectionTarget = useCallback(() => {
    setSelectionTargetId(undefined);
  }, []);

  const refreshIndex = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true, error: undefined }));

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Refreshing FMHY index",
    });

    try {
      const index = await fetchFmhyIndex();
      const cached = writeCachedIndex(index);

      setState({
        index,
        timestamp: cached.timestamp,
        isLoading: false,
        isStale: false,
      });

      toast.style = Toast.Style.Success;
      toast.title = "FMHY index refreshed";
      toast.message = `${formatResultCount(index.results.length)} resources cached`;
    } catch (error) {
      const cached = readCachedIndex();
      const message = getErrorMessage(error);

      if (cached) {
        setState({
          ...stateFromCache(cached),
          isLoading: false,
          error: message,
        });

        toast.style = Toast.Style.Failure;
        toast.title = "Refresh failed";
        toast.message = `Using cached index from ${formatTimestamp(cached.timestamp)}`;
        return;
      }

      setState({ index: EMPTY_INDEX, isLoading: false, error: message });
      toast.style = Toast.Style.Failure;
      toast.title = "Unable to load FMHY index";
      toast.message = message;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadIndex() {
      const cached = readCachedIndex();

      if (cached) {
        setState({
          ...stateFromCache(cached),
          isLoading: false,
        });

        return;
      }

      try {
        const index = await fetchFmhyIndex();
        const refreshed = writeCachedIndex(index);

        if (!isMounted) {
          return;
        }

        setState({
          index,
          timestamp: refreshed.timestamp,
          isLoading: false,
          isStale: false,
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const message = getErrorMessage(error);

        if (cached) {
          setState({
            ...stateFromCache(cached),
            isLoading: false,
            error: message,
          });

          await showToast({
            style: Toast.Style.Failure,
            title: "Using stale FMHY index",
            message,
          });
          return;
        }

        setState({ index: EMPTY_INDEX, isLoading: false, error: message });
        await showToast({
          style: Toast.Style.Failure,
          title: "Unable to load FMHY index",
          message,
        });
      }
    }

    void loadIndex();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectionTargetId) {
      return;
    }

    const timeout = setTimeout(() => setSelectionTargetId(undefined), 0);
    return () => clearTimeout(timeout);
  }, [selectionTargetId]);

  const hasVisibleResults = visibleResultSet.results.length > 0;
  const hasMoreResults = visibleResultSet.results.length < visibleResultSet.total;
  const hasNoMatches = state.index.results.length > 0 && !hasVisibleResults && !state.isLoading;

  return (
    <List
      navigationTitle="Search FMHY..."
      searchBarPlaceholder="Search FMHY..."
      searchText={searchText}
      onSearchTextChange={handleSearchTextChange}
      {...(selectionTargetId ? { selectedItemId: selectionTargetId, onSelectionChange: clearSelectionTarget } : {})}
      filtering={false}
      isLoading={state.isLoading}
    >
      {state.index.results.length > 0 ? (
        <IndexStatusSection state={state} onRefresh={refreshIndex} position="top" />
      ) : null}
      {hasVisibleResults
        ? visibleResultSections.map((section) => (
            <List.Section key={section.title} title={section.title} subtitle={getSectionSubtitle(section)}>
              {section.results.map((result) => (
                <List.Item
                  id={result.url}
                  key={result.url}
                  icon={getResultIcon(result)}
                  title={result.title}
                  subtitle={result.description || result.url}
                  accessories={getResultAccessories(result)}
                  actions={<ResultActions result={result} category={section.category} onRefresh={refreshIndex} />}
                />
              ))}
            </List.Section>
          ))
        : null}
      {hasMoreResults ? (
        <List.Section title="More">
          <List.Item
            id={LOAD_MORE_ITEM_ID}
            icon={Icon.ArrowDownCircle}
            title="Load More Results"
            subtitle={`${formatResultCount(visibleResultSet.total - visibleResultSet.results.length)} more matches`}
            actions={
              <ActionPanel>
                <Action title="Load More Results" icon={Icon.ArrowDownCircle} onAction={loadMoreResults} />
                <Action
                  title="Refresh Index"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={refreshIndex}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
      {state.index.results.length === 0 && !state.isLoading ? (
        <List.Item
          title={state.error ? "Unable to load FMHY index" : "No FMHY resources found"}
          subtitle={state.error || "Refresh the index to try again"}
          actions={
            <ActionPanel>
              <Action
                title="Refresh Index"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={refreshIndex}
              />
            </ActionPanel>
          }
        />
      ) : null}
      {hasNoMatches ? (
        <List.Item
          title="No matching FMHY resources"
          subtitle="Try another search"
          actions={
            <ActionPanel>
              <Action
                title="Refresh Index"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={refreshIndex}
              />
            </ActionPanel>
          }
        />
      ) : null}
      {state.index.results.length > 0 ? (
        <IndexStatusSection state={state} onRefresh={refreshIndex} position="bottom" />
      ) : null}
    </List>
  );
}

function ResultActions({
  result,
  category,
  onRefresh,
}: {
  result: FmhyResult;
  category?: FmhyCategory;
  onRefresh: () => Promise<void>;
}) {
  const categoryUrl = normalizeFmhyGeneratedCategoryUrl(result.categoryUrl ?? category?.url);
  const { quickLinks, relatedLinks } = splitRelatedLinks(result.relatedLinks);

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.OpenInBrowser
          title={result.isRedirect ? "Open Redirect Target" : "Open Resource"}
          icon={result.isRedirect ? Icon.ArrowRight : Icon.Globe}
          url={result.url}
        />
        {categoryUrl ? <Action.OpenInBrowser title="Open Category" icon={Icon.List} url={categoryUrl} /> : null}
        {category?.notes?.length ? (
          <Action.Push
            title={category.notes.length === 1 ? "Show Category Note" : "Show Category Notes"}
            icon={Icon.Info}
            shortcut={CATEGORY_NOTE_SHORTCUT}
            target={<CategoryNoteDetail category={category} categoryUrl={categoryUrl} />}
          />
        ) : null}
      </ActionPanel.Section>
      {quickLinks.length > 0 ? (
        <ActionPanel.Section title="Quick Links">
          {quickLinks.map((link) => (
            <Action.OpenInBrowser
              key={link.url}
              title={`Open ${formatRelatedLinkTitle(link)}`}
              icon={getRelatedLinkIcon(link.kind)}
              url={link.url}
            />
          ))}
        </ActionPanel.Section>
      ) : null}
      {relatedLinks.length > 0 ? (
        <ActionPanel.Section title="Related Links">
          <Action.Push
            title={`Show ${formatRelatedLinkCount(relatedLinks.length)}`}
            icon={Icon.Link}
            target={<RelatedLinksList result={result} links={relatedLinks} />}
          />
        </ActionPanel.Section>
      ) : null}
      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy URL" content={result.url} />
        <Action.CopyToClipboard title="Copy Title" content={result.title} />
        <Action
          title="Refresh Index"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={onRefresh}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function RelatedLinksList({ result, links }: { result: FmhyResult; links: FmhyRelatedLink[] }) {
  return (
    <List navigationTitle="Related Links" searchBarPlaceholder="Search related links...">
      <List.Section title={result.title} subtitle={formatRelatedLinkCount(links.length)}>
        {links.map((link) => (
          <List.Item
            key={link.url}
            icon={getRelatedLinkIcon(link.kind)}
            title={link.title}
            subtitle={formatRelatedLinkSubtitle(link)}
            accessories={getRelatedLinkAccessories(link)}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.OpenInBrowser title="Open Related Link" icon={getRelatedLinkIcon(link.kind)} url={link.url} />
                  <Action.OpenInBrowser title="Open Resource" icon={Icon.Globe} url={result.url} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.CopyToClipboard title="Copy Related URL" content={link.url} />
                  <Action.CopyToClipboard title="Copy Related Title" content={formatRelatedLinkTitle(link)} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function IndexStatusSection({
  state,
  onRefresh,
  position,
}: {
  state: IndexState;
  onRefresh: () => Promise<void>;
  position: "top" | "bottom";
}) {
  return (
    <List.Section title={position === "top" ? "FMHY Index" : "Index"}>
      <List.Item
        icon={Icon.Clock}
        title={getIndexStatusTitle(state)}
        subtitle={getIndexStatusSubtitle(state)}
        accessories={getIndexStatusAccessories(state)}
        actions={
          <ActionPanel>
            <Action
              title="Refresh Index"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={onRefresh}
            />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}

function CategoryNoteDetail({ category, categoryUrl }: { category: FmhyCategory; categoryUrl?: string }) {
  const notes = category.notes ?? [];
  const normalizedCategoryUrl = normalizeFmhyGeneratedCategoryUrl(categoryUrl ?? category.url);
  const markdown = [`# ${escapeMarkdown(category.name)}`, ...notes.map(formatCategoryNoteMarkdown)].join("\n\n");

  return (
    <Detail
      markdown={markdown}
      navigationTitle={category.name}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Category" text={category.name} />
          <Detail.Metadata.Label title="Notes" text={formatResultCount(notes.length)} />
          {normalizedCategoryUrl ? (
            <Detail.Metadata.Link title="FMHY" text="Open category" target={normalizedCategoryUrl} />
          ) : null}
        </Detail.Metadata>
      }
      actions={
        normalizedCategoryUrl ? (
          <ActionPanel>
            <Action.OpenInBrowser title="Open Category" icon={Icon.List} url={normalizedCategoryUrl} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

function stateFromCache(cached: FmhyIndexCache): Pick<IndexState, "index" | "timestamp" | "isStale" | "isLegacyCache"> {
  return {
    index: cached.index,
    timestamp: cached.timestamp,
    isStale: !isCachedIndexFresh(cached),
    isLegacyCache: cached.isLegacy,
  };
}

function groupResultsByCategory(results: FmhyResult[], categoriesByName: Map<string, FmhyCategory>): ResultSection[] {
  const sections = new Map<string, FmhyResult[]>();

  for (const result of results) {
    const title = result.category || UNCATEGORIZED_SECTION_TITLE;
    const sectionResults = sections.get(title) ?? [];
    sectionResults.push(result);
    sections.set(title, sectionResults);
  }

  return [...sections.entries()].map(([title, sectionResults]) => ({
    title,
    results: sectionResults,
    category: categoriesByName.get(title),
  }));
}

function getSectionSubtitle(section: ResultSection): string {
  const parts = [formatResultCount(section.results.length)];

  if (section.category?.notes?.length) {
    parts.push(section.category.notes.length === 1 ? "Note" : `${section.category.notes.length} notes`);
  }

  return parts.join(" - ");
}

function getCategoriesByName(categories: FmhyCategory[]): Map<string, FmhyCategory> {
  return new Map(categories.map((category) => [category.name, category]));
}

function getResultIcon(result: FmhyResult) {
  if (result.isStarred) {
    return { source: Icon.Star, tintColor: Color.Yellow };
  }

  if (result.isRedirect) {
    return { source: Icon.ArrowRight, tintColor: Color.Blue };
  }

  if (result.isIndex) {
    return { source: Icon.Globe, tintColor: Color.Blue };
  }

  return undefined;
}

function getResultAccessories(result: FmhyResult): List.Item.Accessory[] | undefined {
  const accessories: List.Item.Accessory[] = [];

  if (result.isStarred) {
    accessories.push({ text: "Starred", icon: { source: Icon.Star, tintColor: Color.Yellow } });
  }

  if (result.isRedirect) {
    accessories.push({ text: "Redirect", icon: Icon.ArrowRight });
  }

  if (result.isIndex) {
    accessories.push({ text: "Index", icon: Icon.Globe });
  }

  for (const kind of getUniqueQuickRelatedLinkKinds(result.relatedLinks).slice(0, 4)) {
    accessories.push({ icon: getRelatedLinkIcon(kind) });
  }

  const relatedLinkCount = getRelatedLinks(result.relatedLinks).length;
  if (relatedLinkCount > 0) {
    accessories.push({ text: String(relatedLinkCount), icon: Icon.Link });
  }

  return accessories.length > 0 ? accessories : undefined;
}

function splitRelatedLinks(links: FmhyRelatedLink[] | undefined): {
  quickLinks: FmhyRelatedLink[];
  relatedLinks: FmhyRelatedLink[];
} {
  const quickLinks: FmhyRelatedLink[] = [];
  const relatedLinks: FmhyRelatedLink[] = [];

  for (const link of links ?? []) {
    if (isQuickRelatedLink(link)) {
      quickLinks.push(link);
      continue;
    }

    relatedLinks.push(link);
  }

  return { quickLinks, relatedLinks };
}

function getRelatedLinks(links: FmhyRelatedLink[] | undefined): FmhyRelatedLink[] {
  return splitRelatedLinks(links).relatedLinks;
}

function isQuickRelatedLink(link: FmhyRelatedLink): boolean {
  return Boolean(link.kind && QUICK_RELATED_LINK_KINDS.has(link.kind));
}

function getUniqueQuickRelatedLinkKinds(relatedLinks: FmhyRelatedLink[] | undefined): FmhyRelatedLinkKind[] {
  const kinds = new Set<FmhyRelatedLinkKind>();

  for (const link of relatedLinks ?? []) {
    if (link.kind && QUICK_RELATED_LINK_KINDS.has(link.kind)) {
      kinds.add(link.kind);
    }
  }

  return [...kinds];
}

function getRelatedLinkIcon(kind: FmhyRelatedLinkKind | undefined) {
  if (kind) {
    const brandIcon = RELATED_LINK_BRAND_ICONS[kind];
    if (brandIcon) {
      return brandIcon;
    }
  }

  switch (kind) {
    case "source":
      return Icon.Code;
    case "fmhy":
      return Icon.List;
    case "website":
    default:
      return Icon.Link;
  }
}

function formatRelatedLinkTitle(link: FmhyRelatedLink): string {
  return link.group ? `${link.group}: ${link.title}` : link.title;
}

function formatRelatedLinkSubtitle(link: FmhyRelatedLink): string {
  const hostname = getHostname(link.url);
  return [link.group, hostname ?? link.url].filter(Boolean).join(" - ");
}

function getRelatedLinkAccessories(link: FmhyRelatedLink): List.Item.Accessory[] | undefined {
  return link.kind ? [{ text: formatRelatedLinkKind(link.kind) }] : undefined;
}

function formatRelatedLinkKind(kind: FmhyRelatedLinkKind): string {
  switch (kind) {
    case "fmhy":
      return "FMHY";
    case "github":
      return "GitHub";
    case "gitlab":
      return "GitLab";
    case "reddit":
      return "Reddit";
    case "telegram":
      return "Telegram";
    case "twitter":
      return "X";
    default:
      return kind.charAt(0).toLocaleUpperCase() + kind.slice(1);
  }
}

function formatRelatedLinkCount(count: number): string {
  return count === 1 ? "1 Related Link" : `${count} Related Links`;
}

function getHostname(url: string): string | undefined {
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}

function getRefreshShortcutLabel(): string {
  return "Command+R on macOS or Ctrl+R on Windows";
}

function getIndexStatusTitle(state: IndexState): string {
  if (state.isLegacyCache) {
    return "Legacy cache loaded - refresh to enable new parsing";
  }

  return state.timestamp ? `Last refreshed ${formatTimestamp(state.timestamp)}` : "Index not cached";
}

function getIndexStatusSubtitle(state: IndexState): string {
  if (state.isLegacyCache) {
    return `Use ${getRefreshShortcutLabel()} to rebuild categories, notes, redirects, and related links`;
  }

  return `Use ${getRefreshShortcutLabel()} or the action menu to refresh`;
}

function getIndexStatusAccessories(state: IndexState): List.Item.Accessory[] {
  const statusText = state.isLegacyCache ? "Needs refresh" : state.isStale ? "Stale" : "Fresh";
  const statusIcon = state.isLegacyCache || state.isStale ? Icon.Warning : Icon.CheckCircle;

  return [
    { text: statusText, icon: statusIcon },
    { text: formatResultCount(state.index.results.length), icon: Icon.List },
  ];
}

function escapeMarkdown(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/([`*_{}[\]()#+.!|-])/g, "\\$1");
}

function formatCategoryNoteMarkdown(note: string, index: number): string {
  return `## Note ${index + 1}\n\n${escapeMarkdown(note)}`;
}
