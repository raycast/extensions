import {
  Action,
  ActionPanel,
  Cache,
  Color,
  Detail,
  Image,
  Icon,
  LaunchProps,
  List,
  environment,
  getPreferenceValues,
  open,
} from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { searchDocs, searchGlossary } from "./api";
import { summaryHtmlToMarkdown } from "./summary-to-markdown";
import type { DocsSearchResult, GlossaryTerm } from "./types";

const DEBOUNCE_MS = 250;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const GLOSSARY_INDEX_CACHE_KEY = "glossary-index";
const RECENT_ITEMS_CACHE_KEY = "recent-items";
const RECENT_ITEMS_LIMIT = 10;
const ASSETS_DIR = `${environment.assetsPath}/icons`;
const ICONS = {
  all: `${ASSETS_DIR}/book-2.svg`,
  cms: `${ASSETS_DIR}/square-letter-c.svg`,
  commerce: `${ASSETS_DIR}/shopping-cart.svg`,
  cloud: `${ASSETS_DIR}/cloud.svg`,
  kb: `${ASSETS_DIR}/book.svg`,
  glossary: `${ASSETS_DIR}/list-letters.svg`,
  bookmarks: `${ASSETS_DIR}/bookmark.svg`,
  bookmarkOff: `${ASSETS_DIR}/bookmark-off.svg`,
} as const;
const LIST_ICON_TINT = "#E5422C";
const DOC_PRODUCTS = [
  { title: "All Docs", value: "all", icon: ICONS.all },
  { title: "CMS", value: "cms", icon: ICONS.cms },
  { title: "Commerce", value: "commerce", icon: ICONS.commerce },
  { title: "Cloud", value: "cloud", icon: ICONS.cloud },
  { title: "Knowledge Base", value: "knowledge-base", icon: ICONS.kb },
  { title: "Glossary", value: "glossary", icon: ICONS.glossary },
  { title: "Bookmarks", value: "bookmarks", icon: ICONS.bookmarks },
] as const;
type DocsProduct = (typeof DOC_PRODUCTS)[number]["value"];
type GlossaryIndex = Record<string, string>;
const cache = new Cache({ namespace: "craft-docs-search" });
const queryCache = new Map<string, DocsSearchResult[]>();

interface Preferences {
  cmsVersion: "1.x" | "2.x" | "3.x" | "4.x" | "5.x";
  commerceVersion: "1.x" | "2.x" | "3.x" | "4.x" | "5.x";
  viewMode: "rich" | "compact";
}

type Props = LaunchProps<{
  arguments: { term?: string };
  launchContext?: { slug?: string; product?: DocsProduct };
}>;

export default function Command(props: Props) {
  const preferences = getPreferenceValues<Preferences>();
  const argumentTerm = props.arguments?.term?.trim();
  const deeplinkSlug = props.launchContext?.slug?.trim();
  const deeplinkProduct = props.launchContext?.product;
  const forceAllDocsForArgument = Boolean(argumentTerm);
  const initialSearchText = argumentTerm || "";
  const launchSelectedProduct: DocsProduct | undefined =
    deeplinkProduct && DOC_PRODUCTS.some((p) => p.value === deeplinkProduct) ? deeplinkProduct : undefined;
  const initialSelectedProduct: DocsProduct = forceAllDocsForArgument
    ? "all"
    : launchSelectedProduct
      ? launchSelectedProduct
      : DOC_PRODUCTS[0].value;
  const initialGlossaryItems =
    initialSelectedProduct === "glossary" && !initialSearchText
      ? (readCached(makeRequestCacheKey({ product: "glossary", query: "", version: undefined, scopes: [] })) ?? [])
      : [];
  const initialGlossaryIndex = deeplinkSlug ? readGlossaryIndex() : null;
  const initialShouldSearch = initialSearchText.trim().length > 0 || initialSelectedProduct === "glossary";
  const [searchText, setSearchText] = useState(initialSearchText);
  const [query, setQuery] = useState(initialSearchText);
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(() =>
    deeplinkSlug ? initialGlossaryIndex?.[normalizeSlugKey(deeplinkSlug)] : undefined,
  );
  const [selectedProduct, setSelectedProduct] = useCachedState<DocsProduct>(
    "craft-docs-selected-product",
    initialSelectedProduct,
  );
  const [launchProductOverride, setLaunchProductOverride] = useState<DocsProduct | undefined>(() =>
    forceAllDocsForArgument ? "all" : launchSelectedProduct,
  );
  const effectiveSelectedProduct: DocsProduct = launchProductOverride ?? selectedProduct;
  const [bookmarks, setBookmarks] = useCachedState<DocsSearchResult[]>("craft-docs-bookmarks", []);
  const [recentItems, setRecentItems] = useCachedState<DocsSearchResult[]>(
    "craft-docs-recent",
    readRecentItems() ?? [],
  );
  const [items, setItems] = useState<DocsSearchResult[]>(initialGlossaryItems);
  const [isLoading, setIsLoading] = useState(initialShouldSearch);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cmsVersion = normalizeVersionValue(preferences.cmsVersion);
  const commerceVersion = normalizeVersionValue(preferences.commerceVersion);
  const versionParam = normalizeVersionValue(getSelectedVersion(preferences, effectiveSelectedProduct));
  const apiVersionParam = toApiVersion(versionParam);
  const isCompactMode = preferences.viewMode === "compact";
  const scopes = useMemo(
    () => buildScopes({ selectedProduct: effectiveSelectedProduct, cmsVersion, versionParam }),
    [cmsVersion, effectiveSelectedProduct, versionParam],
  );
  const requestCacheKey = useMemo(
    () =>
      makeRequestCacheKey({
        product: effectiveSelectedProduct,
        query,
        version: apiVersionParam,
        scopes,
      }),
    [apiVersionParam, effectiveSelectedProduct, query, scopes],
  );
  const hasLiveQuery = searchText.trim().length > 0;
  const hasQuery = query.trim().length > 0;
  const isDebouncing = searchText.trim() !== query;
  const isGlossaryBrowse = effectiveSelectedProduct === "glossary" && !hasQuery;
  const isBookmarksMode = effectiveSelectedProduct === "bookmarks";
  const shouldSearch = hasLiveQuery || effectiveSelectedProduct === "glossary" || isBookmarksMode;
  const bookmarkedUrls = useMemo(() => new Set((bookmarks ?? []).map((item) => item.url)), [bookmarks]);
  const emptyViewContent = useMemo(
    () => buildEmptyViewContent(effectiveSelectedProduct, preferences),
    [effectiveSelectedProduct, preferences],
  );

  const visibleItems = useMemo(() => {
    if (isBookmarksMode) {
      const q = searchText.trim().toLowerCase();
      if (!q) return bookmarks ?? [];
      return (bookmarks ?? []).filter((item) => {
        const haystack = `${item.title} ${item.slug ?? ""} ${item.summaryPlain ?? ""} ${item.url}`.toLowerCase();
        return haystack.includes(q);
      });
    }

    return items.filter((item) => {
      const product = getProductType(item.url);
      if (effectiveSelectedProduct === "all") {
        if (isVersionExemptType(item.type)) {
          if (product === "cms") return matchesItemVersionOrUnversioned(item, cmsVersion);
          if (product === "commerce") return matchesItemVersionOrUnversioned(item, commerceVersion);
          return true;
        }
        if (product === "cms") return matchesItemVersion(item, cmsVersion);
        if (product === "commerce") return matchesItemVersion(item, commerceVersion);
        return true;
      }
      if (product !== effectiveSelectedProduct) return false;
      if (isVersionExemptType(item.type)) return matchesItemVersionOrUnversioned(item, versionParam);
      if (isUnversionedProduct(effectiveSelectedProduct)) return true;
      return matchesItemVersion(item, versionParam);
    });
  }, [
    bookmarks,
    commerceVersion,
    cmsVersion,
    effectiveSelectedProduct,
    isBookmarksMode,
    items,
    searchText,
    versionParam,
  ]);
  const groupedGlossary = useMemo(
    () => (isGlossaryBrowse ? groupByLetter(visibleItems) : null),
    [isGlossaryBrowse, visibleItems],
  );
  const showRecentHome = effectiveSelectedProduct === "all" && !shouldSearch && (recentItems?.length ?? 0) > 0;
  const showPlaceholder =
    (!shouldSearch && effectiveSelectedProduct !== "bookmarks" && !showRecentHome) ||
    (effectiveSelectedProduct === "bookmarks" && !errorMessage && visibleItems.length === 0) ||
    (shouldSearch &&
      !isGlossaryBrowse &&
      !isBookmarksMode &&
      !errorMessage &&
      visibleItems.length === 0 &&
      (isLoading || isDebouncing));
  const showGlossaryLoadingRow = isGlossaryBrowse && !deeplinkSlug && !errorMessage && visibleItems.length === 0;

  useEffect(() => {
    if (forceAllDocsForArgument) {
      setSelectedProduct("all");
      return;
    }
    if (!deeplinkProduct) return;
    if (!DOC_PRODUCTS.some((p) => p.value === deeplinkProduct)) return;
    setSelectedProduct(deeplinkProduct);
  }, [deeplinkProduct, forceAllDocsForArgument, setSelectedProduct]);

  useEffect(() => {
    if (!deeplinkSlug) return;
    const indexedMatch = readGlossaryIndex()?.[normalizeSlugKey(deeplinkSlug)];
    if (indexedMatch) {
      setSelectedItemId(indexedMatch);
      return;
    }
    const match =
      visibleItems.find((item) => item.slug === deeplinkSlug) ||
      visibleItems.find((item) => item.slug?.toLowerCase() === deeplinkSlug.toLowerCase());
    if (match) {
      setSelectedItemId(match.id);
    }
  }, [deeplinkSlug, visibleItems]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const nextQuery = searchText.trim();
      if (nextQuery !== query) {
        if (nextQuery || effectiveSelectedProduct === "glossary") {
          setIsLoading(true);
        }
        setQuery(nextQuery);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchText, query, effectiveSelectedProduct]);

  useEffect(() => {
    if (effectiveSelectedProduct === "bookmarks") {
      setIsLoading(false);
      return;
    }
    if (query || effectiveSelectedProduct === "glossary") {
      setIsLoading(true);
    }
  }, [effectiveSelectedProduct, query]);

  useEffect(() => {
    if (effectiveSelectedProduct === "bookmarks") {
      setErrorMessage(null);
      setIsLoading(false);
      abortRef.current?.abort();
      return;
    }

    if (!query && effectiveSelectedProduct !== "glossary") {
      setItems([]);
      setErrorMessage(null);
      setIsLoading(false);
      abortRef.current?.abort();
      return;
    }

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    // Fast-path glossary term lookups from cached full glossary list.
    if (effectiveSelectedProduct === "glossary" && query) {
      const cachedGlossaryItems = readCached(
        makeRequestCacheKey({ product: "glossary", query: "", version: undefined, scopes: [] }),
      );
      if (cachedGlossaryItems) {
        const q = query.trim().toLowerCase();
        const localMatches = cachedGlossaryItems.filter((item) => {
          const haystack = `${item.title} ${item.slug ?? ""} ${item.summaryPlain ?? ""}`.toLowerCase();
          return haystack.includes(q);
        });
        setItems(localMatches);
      }
    }

    const inMemoryCached = queryCache.get(requestCacheKey);
    if (inMemoryCached) {
      if (effectiveSelectedProduct === "glossary") writeGlossaryIndex(inMemoryCached);
      setItems(inMemoryCached);
      setErrorMessage(null);
      setIsLoading(false);
      return () => controller.abort();
    }

    const persistedCached = readCached(requestCacheKey);
    if (persistedCached) {
      if (effectiveSelectedProduct === "glossary") writeGlossaryIndex(persistedCached);
      queryCache.set(requestCacheKey, persistedCached);
      setItems(persistedCached);
      setErrorMessage(null);
      setIsLoading(false);
      return () => controller.abort();
    }

    setIsLoading(true);
    setErrorMessage(null);

    const run =
      effectiveSelectedProduct === "glossary"
        ? searchGlossary(query, { signal: controller.signal }).then((terms) => terms.map(mapGlossaryTermToDocsResult))
        : searchDocs(query, { signal: controller.signal, version: apiVersionParam, scopes });

    run
      .then((results) => {
        if (effectiveSelectedProduct === "glossary") writeGlossaryIndex(results);
        queryCache.set(requestCacheKey, results);
        writeCached(requestCacheKey, results);
        setItems(results);
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        const staleResults = readCached(requestCacheKey, true);
        if (staleResults) {
          queryCache.set(requestCacheKey, staleResults);
          setItems(staleResults);
          setErrorMessage(null);
          return;
        }
        setItems([]);
        setErrorMessage("Could not fetch docs search results.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [query, apiVersionParam, requestCacheKey, scopes, effectiveSelectedProduct]);

  function addBookmark(item: DocsSearchResult) {
    setBookmarks((current) => {
      const existing = current ?? [];
      if (existing.some((bookmark) => bookmark.url === item.url)) return existing;
      return [item, ...existing];
    });
  }

  function removeBookmark(item: DocsSearchResult) {
    setBookmarks((current) => (current ?? []).filter((bookmark) => bookmark.url !== item.url));
  }

  function recordRecent(item: DocsSearchResult) {
    const existing = (recentItems ?? []).filter((recent) => recent.url !== item.url);
    const nextRecentItems = [item, ...existing].slice(0, RECENT_ITEMS_LIMIT);
    writeRecentItems(nextRecentItems);
    setRecentItems(nextRecentItems);
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={!isCompactMode}
      filtering={false}
      searchBarPlaceholder={buildSearchPlaceholder(effectiveSelectedProduct, preferences)}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      selectedItemId={selectedItemId}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Craft Docs Section"
          value={effectiveSelectedProduct}
          onChange={(value) => {
            const nextProduct = value as DocsProduct;
            setLaunchProductOverride(undefined);
            setSelectedProduct(nextProduct);
            if (nextProduct === "glossary" || searchText.trim().length > 0) {
              setIsLoading(true);
            }
          }}
        >
          <List.Dropdown.Section>
            <List.Dropdown.Item
              title={getDropdownTitle(DOC_PRODUCTS[0].value, preferences)}
              value={DOC_PRODUCTS[0].value}
              icon={tintSecondaryIcon(DOC_PRODUCTS[0].icon)}
            />
          </List.Dropdown.Section>
          <List.Dropdown.Section>
            {DOC_PRODUCTS.slice(1, 4).map((product) => (
              <List.Dropdown.Item
                key={product.value}
                title={getDropdownTitle(product.value, preferences)}
                value={product.value}
                icon={tintSecondaryIcon(product.icon)}
              />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section>
            {DOC_PRODUCTS.slice(4, 6).map((product) => (
              <List.Dropdown.Item
                key={product.value}
                title={getDropdownTitle(product.value, preferences)}
                value={product.value}
                icon={tintSecondaryIcon(product.icon)}
              />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section>
            <List.Dropdown.Item
              title={getDropdownTitle(DOC_PRODUCTS[6].value, preferences)}
              value={DOC_PRODUCTS[6].value}
              icon={tintSecondaryIcon(DOC_PRODUCTS[6].icon)}
            />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      throttle
    >
      {showPlaceholder && (
        <List.EmptyView
          title={emptyViewContent.title}
          description={emptyViewContent.description}
          icon={buildEmptyViewIcon(effectiveSelectedProduct)}
        />
      )}

      {showGlossaryLoadingRow && (
        <List.Section title="A">
          <List.Item id="glossary-loading-placeholder" title="" />
        </List.Section>
      )}

      {showRecentHome && (
        <List.Section title="Recently Opened">
          {(recentItems ?? []).map((item) => (
            <ResultRow
              key={`recent-${item.id}`}
              item={item}
              selectedProduct={effectiveSelectedProduct}
              isCompactMode={isCompactMode}
              isBookmarked={bookmarkedUrls.has(item.url)}
              onAddBookmark={addBookmark}
              onRemoveBookmark={removeBookmark}
              onOpenItem={recordRecent}
            />
          ))}
        </List.Section>
      )}

      {shouldSearch && !!errorMessage && (
        <List.Item id="docs-search-error" title={errorMessage} icon={Icon.ExclamationMark} actions={<ActionPanel />} />
      )}

      {shouldSearch &&
        !errorMessage &&
        (isGlossaryBrowse
          ? groupedGlossary?.keys.map((letter) => (
              <List.Section key={letter} title={letter}>
                {(groupedGlossary.map.get(letter) ?? []).map((item) => (
                  <ResultRow
                    key={item.id}
                    item={item}
                    selectedProduct={effectiveSelectedProduct}
                    isCompactMode={isCompactMode}
                    isBookmarked={bookmarkedUrls.has(item.url)}
                    onAddBookmark={addBookmark}
                    onRemoveBookmark={removeBookmark}
                    onOpenItem={recordRecent}
                  />
                ))}
              </List.Section>
            ))
          : visibleItems.map((item) => (
              <ResultRow
                key={item.id}
                item={item}
                selectedProduct={effectiveSelectedProduct}
                isCompactMode={isCompactMode}
                isBookmarked={bookmarkedUrls.has(item.url)}
                onAddBookmark={addBookmark}
                onRemoveBookmark={removeBookmark}
                onOpenItem={recordRecent}
              />
            )))}
    </List>
  );
}

function ResultRow({
  item,
  selectedProduct,
  isCompactMode,
  isBookmarked,
  onAddBookmark,
  onRemoveBookmark,
  onOpenItem,
}: {
  item: DocsSearchResult;
  selectedProduct: DocsProduct;
  isCompactMode: boolean;
  isBookmarked: boolean;
  onAddBookmark: (item: DocsSearchResult) => void;
  onRemoveBookmark: (item: DocsSearchResult) => void;
  onOpenItem: (item: DocsSearchResult) => void;
}) {
  return (
    <List.Item
      id={item.id}
      title={item.title}
      subtitle={isCompactMode ? buildSubtitle(item) : undefined}
      accessories={buildBookmarkAccessory(isBookmarked, selectedProduct)}
      icon={buildListIcon(item, selectedProduct)}
      detail={isCompactMode ? undefined : <DocsItemDetail item={item} />}
      actions={
        <ActionPanel>
          <Action
            title="Open in Browser"
            icon={ACTION_ICONS.globe}
            onAction={async () => {
              onOpenItem(item);
              await open(item.url);
            }}
          />
          {isCompactMode && (
            <Action.Push
              title="View Detail"
              icon={ACTION_ICONS.sidebar}
              target={<DocsDetailView item={item} onOpenItem={onOpenItem} />}
            />
          )}
          {(item.docsLinks?.length ?? 0) > 0 && (
            <ActionPanel.Submenu
              title="In the Docs"
              icon={ACTION_ICONS.book}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            >
              {item.docsLinks?.map((d, i) => (
                <Action.OpenInBrowser
                  key={`${item.id}-doc-action-${i}`}
                  title={d.title}
                  icon={ACTION_ICONS.book}
                  url={d.url}
                />
              ))}
            </ActionPanel.Submenu>
          )}
          {isBookmarked ? (
            <Action
              title="Remove Bookmark"
              icon={ACTION_ICONS.removeBookmark}
              onAction={() => onRemoveBookmark(item)}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
            />
          ) : (
            <Action
              title="Bookmark"
              icon={ACTION_ICONS.bookmark}
              onAction={() => onAddBookmark(item)}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
            />
          )}
          <Action.CopyToClipboard title="Copy URL" content={item.url} icon={ACTION_ICONS.clipboard} />
        </ActionPanel>
      }
    />
  );
}

function DocsDetailView({
  item,
  onOpenItem,
}: {
  item: DocsSearchResult;
  onOpenItem: (item: DocsSearchResult) => void;
}) {
  const [bookmarks, setBookmarks] = useCachedState<DocsSearchResult[]>("craft-docs-bookmarks", []);
  const isBookmarked = useMemo(
    () => (bookmarks ?? []).some((bookmark) => bookmark.url === item.url),
    [bookmarks, item.url],
  );

  function addBookmark(detailItem: DocsSearchResult) {
    setBookmarks((current) => {
      const existing = current ?? [];
      if (existing.some((bookmark) => bookmark.url === detailItem.url)) return existing;
      return [detailItem, ...existing];
    });
  }

  function removeBookmark(detailItem: DocsSearchResult) {
    setBookmarks((current) => (current ?? []).filter((bookmark) => bookmark.url !== detailItem.url));
  }

  return (
    <Detail
      markdown={buildDetailMarkdown(item)}
      metadata={<DocsMetadata item={item} />}
      actions={
        <ActionPanel>
          <Action
            title="Open in Browser"
            icon={ACTION_ICONS.globe}
            onAction={async () => {
              onOpenItem(item);
              await open(item.url);
            }}
          />
          {(item.docsLinks?.length ?? 0) > 0 && (
            <ActionPanel.Submenu
              title="In the Docs"
              icon={ACTION_ICONS.book}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            >
              {item.docsLinks?.map((d, i) => (
                <Action.OpenInBrowser
                  key={`${item.id}-detail-doc-action-${i}`}
                  title={d.title}
                  icon={ACTION_ICONS.book}
                  url={d.url}
                />
              ))}
            </ActionPanel.Submenu>
          )}
          {isBookmarked ? (
            <Action
              title="Remove Bookmark"
              icon={ACTION_ICONS.removeBookmark}
              onAction={() => removeBookmark(item)}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
            />
          ) : (
            <Action
              title="Bookmark"
              icon={ACTION_ICONS.bookmark}
              onAction={() => addBookmark(item)}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
            />
          )}
          <Action.CopyToClipboard title="Copy URL" content={item.url} icon={ACTION_ICONS.clipboard} />
        </ActionPanel>
      }
    />
  );
}

function DocsItemDetail({ item }: { item: DocsSearchResult }) {
  return <List.Item.Detail markdown={buildDetailMarkdown(item)} metadata={<DocsMetadata item={item} />} />;
}

function DocsMetadata({ item }: { item: DocsSearchResult }) {
  const docs = item.docsLinks ?? [];
  const isGlossaryItem = linkDestinationForUrl(item.url) === "Glossary";

  return (
    <List.Item.Detail.Metadata>
      {isGlossaryItem ? (
        <>
          <List.Item.Detail.Metadata.Link title={linkDestinationForUrl(item.url)} text={item.title} target={item.url} />
          {docs.length > 0 && <List.Item.Detail.Metadata.Separator />}
          {docs.map((d, i) => (
            <List.Item.Detail.Metadata.Link
              key={`${item.id}-doc-${i}`}
              title={i === 0 ? linkDestinationForUrl(d.url) : ""}
              text={d.title}
              target={d.url}
            />
          ))}
        </>
      ) : (
        <>
          {docs.map((d, i) => (
            <List.Item.Detail.Metadata.Link
              key={`${item.id}-doc-${i}`}
              title={i === 0 ? linkDestinationForUrl(d.url) : ""}
              text={d.title}
              target={d.url}
            />
          ))}
          <List.Item.Detail.Metadata.Link title={linkDestinationForUrl(item.url)} text={item.title} target={item.url} />
        </>
      )}
    </List.Item.Detail.Metadata>
  );
}

function buildDetailMarkdown(item: DocsSearchResult): string {
  const description = item.summaryHtml
    ? summaryHtmlToMarkdown(item.summaryHtml)
    : item.summaryPlain?.trim() || "No summary available.";
  return `# ${item.title}

${description}`;
}

function buildSubtitle(item: DocsSearchResult): string | undefined {
  const summary = toPlainSubtitle(item.summaryPlain);
  if (!summary) return undefined;
  return summary;
}

function toPlainSubtitle(summary: string | undefined): string | undefined {
  if (!summary) return undefined;
  return summary
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function buildListIcon(
  item: DocsSearchResult,
  selectedProduct: DocsProduct,
): Image.ImageLike | { value: Image.ImageLike | undefined | null; tooltip: string } {
  let icon: Image.ImageLike;
  let tooltip: string | undefined;

  if (selectedProduct === "all") {
    const source = getAllDocsSourceLabel(item);
    icon = tintListIcon(getIconForSourceLabel(source));
    tooltip = getSourceTooltip(source);
  } else {
    const product = getProductType(item.url);
    if (product === "cms") icon = tintListIcon(DOC_PRODUCTS[1].icon);
    else if (product === "commerce") icon = tintListIcon(DOC_PRODUCTS[2].icon);
    else if (product === "cloud") icon = tintListIcon(DOC_PRODUCTS[3].icon);
    else if (product === "knowledge-base") icon = tintListIcon(DOC_PRODUCTS[4].icon);
    else icon = tintListIcon(DOC_PRODUCTS[5].icon);
  }

  if (tooltip) {
    return { value: icon, tooltip };
  }

  return icon;
}

function getProductType(url: string): DocsProduct {
  const normalized = url.toLowerCase();
  if (normalized.includes("/glossary")) return "glossary";
  if (normalized.includes("/knowledge-base") || normalized.includes("/kb/")) return "knowledge-base";
  if (normalized.includes("/docs/commerce")) return "commerce";
  if (normalized.includes("/docs/cloud")) return "cloud";
  return "cms";
}

function getSelectedVersion(
  preferences: Preferences,
  product: DocsProduct,
): Preferences[keyof Preferences] | undefined {
  if (product === "all") return undefined;
  if (product === "commerce") return preferences.commerceVersion;
  if (isUnversionedProduct(product)) return undefined;
  return preferences.cmsVersion;
}

function toApiVersion(version: DocsSearchResult["craftVersion"] | undefined): string | undefined {
  if (!version) return undefined;
  const match = version.match(/^([1-5])\.x$/);
  return match?.[1];
}

function normalizeVersionValue(value: string | undefined): DocsSearchResult["craftVersion"] | undefined {
  if (!value) return undefined;
  if (/^[1-5]\.x$/.test(value)) return value as DocsSearchResult["craftVersion"];
  if (/^[1-5]$/.test(value)) return `${value}.x` as DocsSearchResult["craftVersion"];
  return undefined;
}

function extractVersionFromUrl(url: string): DocsSearchResult["craftVersion"] | undefined {
  const match = url.toLowerCase().match(/(?:^|\/)([1-5])\.x(?:\/|$|[?#])/);
  if (!match) return undefined;
  return `${match[1]}.x` as DocsSearchResult["craftVersion"];
}

function matchesItemVersion(item: DocsSearchResult, version: DocsSearchResult["craftVersion"] | undefined): boolean {
  if (!version) return false;
  const urlVersion = extractVersionFromUrl(item.url);
  if (urlVersion) return urlVersion === version;
  if (item.craftVersion) return item.craftVersion === version;
  return false;
}

function matchesItemVersionOrUnversioned(
  item: DocsSearchResult,
  version: DocsSearchResult["craftVersion"] | undefined,
): boolean {
  const urlVersion = extractVersionFromUrl(item.url);
  if (urlVersion) return urlVersion === version;
  if (item.craftVersion) return item.craftVersion === version;
  return true;
}

function isVersionExemptType(type?: string): boolean {
  const normalized = type?.toLowerCase()?.trim();
  return normalized === "term" || normalized === "knowledge base article";
}

function isUnversionedProduct(product: DocsProduct): boolean {
  return product === "cloud" || product === "knowledge-base" || product === "glossary" || product === "bookmarks";
}

function getAllDocsSourceLabel(item: DocsSearchResult): "CMS" | "Commerce" | "Cloud" | "KB" | "Term" {
  const normalizedType = item.type?.toLowerCase()?.trim();
  if (normalizedType === "term") return "Term";
  if (normalizedType === "knowledge base article") return "KB";

  const product = getProductType(item.url);
  if (product === "commerce") return "Commerce";
  if (product === "cloud") return "Cloud";
  if (product === "knowledge-base") return "KB";
  if (product === "glossary") return "Term";
  return "CMS";
}

function getIconForSourceLabel(source: "CMS" | "Commerce" | "Cloud" | "KB" | "Term"): string {
  if (source === "CMS") return DOC_PRODUCTS[1].icon;
  if (source === "Commerce") return DOC_PRODUCTS[2].icon;
  if (source === "Cloud") return DOC_PRODUCTS[3].icon;
  if (source === "KB") return DOC_PRODUCTS[4].icon;
  return DOC_PRODUCTS[5].icon;
}

function getSourceTooltip(source: "CMS" | "Commerce" | "Cloud" | "KB" | "Term"): string | undefined {
  if (source === "CMS") return "Craft CMS";
  if (source === "Commerce") return "Craft Commerce";
  if (source === "KB") return "Knowledge Base";
  if (source === "Term") return "Glossary Term";
  return undefined;
}

function tintListIcon(source: string): { source: string; tintColor: string } {
  return { source, tintColor: LIST_ICON_TINT };
}

function buildEmptyViewIcon(selectedProduct: DocsProduct): { source: string; tintColor: string } {
  const product = DOC_PRODUCTS.find((item) => item.value === selectedProduct) ?? DOC_PRODUCTS[0];
  return tintListIcon(product.icon);
}

function buildEmptyViewContent(product: DocsProduct, preferences: Preferences): { title: string; description: string } {
  if (product === "cms") {
    return {
      title: "Craft CMS Docs",
      description: `Search across official Craft CMS ${preferences.cmsVersion} docs.`,
    };
  }
  if (product === "commerce") {
    return {
      title: "Craft Commerce Docs",
      description: `Search across official Craft Commerce ${preferences.commerceVersion} docs.`,
    };
  }
  if (product === "cloud") {
    return {
      title: "Craft Cloud Docs",
      description: "Search across official Craft Cloud docs.",
    };
  }
  if (product === "knowledge-base") {
    return {
      title: "Craft Knowledge Base",
      description: "Search tutorials, support articles, and troubleshooting guides.",
    };
  }
  if (product === "glossary") {
    return {
      title: "Craft Glossary",
      description: "Search or browse Craft CMS glossary terms.",
    };
  }
  if (product === "bookmarks") {
    return {
      title: "Bookmarks",
      description: "Bookmark items from any section to save them here.",
    };
  }
  return {
    title: "Craft Docs",
    description: "Search across Craft CMS, Commerce, Cloud, Knowledge Base, and Glossary entries.",
  };
}

function linkDestinationForUrl(url: string): "Docs" | "Knowledge Base" | "Glossary" {
  const normalized = url.toLowerCase();
  if (normalized.includes("/glossary/")) return "Glossary";
  if (normalized.includes("/knowledge-base") || normalized.includes("/kb/")) return "Knowledge Base";
  return "Docs";
}

function makeRequestCacheKey({
  product,
  query,
  version,
  scopes,
}: {
  product: DocsProduct;
  query: string;
  version?: string;
  scopes: string[];
}): string {
  return JSON.stringify({
    product,
    query: query.trim(),
    version: version ?? "",
    scopes: [...scopes].sort(),
  });
}

function writeCached(key: string, items: DocsSearchResult[]) {
  try {
    cache.set(key, JSON.stringify({ at: Date.now(), items }));
  } catch {
    // ignore cache write failures
  }
}

function readCached(key: string, allowStale = false): DocsSearchResult[] | null {
  try {
    const raw = cache.get(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; items: DocsSearchResult[] };
    if (!allowStale && Date.now() - parsed.at > CACHE_TTL_MS) return null;
    return parsed.items ?? null;
  } catch {
    return null;
  }
}

function normalizeSlugKey(slug: string): string {
  return slug.trim().toLowerCase();
}

function buildGlossaryIndex(items: DocsSearchResult[]): GlossaryIndex {
  const index: GlossaryIndex = {};
  for (const item of items) {
    if (!item.slug) continue;
    index[normalizeSlugKey(item.slug)] = item.id;
  }
  return index;
}

function readGlossaryIndex(): GlossaryIndex | null {
  try {
    const raw = cache.get(GLOSSARY_INDEX_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; index: GlossaryIndex };
    if (Date.now() - parsed.at > CACHE_TTL_MS) return null;
    return parsed.index ?? null;
  } catch {
    return null;
  }
}

function writeGlossaryIndex(items: DocsSearchResult[]) {
  try {
    const existing = readGlossaryIndex() ?? {};
    const next = { ...existing, ...buildGlossaryIndex(items) };
    cache.set(GLOSSARY_INDEX_CACHE_KEY, JSON.stringify({ at: Date.now(), index: next }));
  } catch {
    // ignore cache write failures
  }
}

function readRecentItems(): DocsSearchResult[] | null {
  try {
    const raw = cache.get(RECENT_ITEMS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; items: DocsSearchResult[] };
    if (Date.now() - parsed.at > CACHE_TTL_MS) return null;
    return parsed.items ?? null;
  } catch {
    return null;
  }
}

function writeRecentItems(items: DocsSearchResult[]) {
  try {
    cache.set(RECENT_ITEMS_CACHE_KEY, JSON.stringify({ at: Date.now(), items }));
  } catch {
    // ignore cache write failures
  }
}

function buildScopes({
  selectedProduct,
  cmsVersion,
  versionParam,
}: {
  selectedProduct: DocsProduct;
  cmsVersion: DocsSearchResult["craftVersion"] | undefined;
  versionParam: DocsSearchResult["craftVersion"] | undefined;
}): string[] {
  if (selectedProduct === "bookmarks") return [];
  if (selectedProduct === "cms") {
    return [versionParam ? `docs/${versionParam}` : `docs/${cmsVersion ?? "5.x"}`];
  }
  if (selectedProduct === "commerce") return ["docs/commerce"];
  if (selectedProduct === "cloud") return ["docs/cloud"];
  return [];
}

function getDropdownTitle(product: DocsProduct, preferences: Preferences): string {
  if (product === "cms") return `CMS (${preferences.cmsVersion})`;
  if (product === "commerce") return `Commerce (${preferences.commerceVersion})`;
  const base = DOC_PRODUCTS.find((item) => item.value === product);
  return base?.title ?? product;
}

function buildSearchPlaceholder(product: DocsProduct, preferences: Preferences): string {
  if (product === "bookmarks") return "Search Bookmarks...";
  if (product === "cms") return `Search Craft CMS ${preferences.cmsVersion} Docs...`;
  if (product === "commerce") return `Search Craft Commerce ${preferences.commerceVersion} Docs...`;
  if (product === "cloud") return "Search Craft Cloud Docs...";
  if (product === "knowledge-base") return "Search Craft Knowledge Base...";
  if (product === "glossary") return "Search Craft Glossary...";
  return "Search Craft Docs...";
}

function mapGlossaryTermToDocsResult(term: GlossaryTerm): DocsSearchResult {
  return {
    id: `glossary-${term.id}`,
    title: term.title,
    url: term.url,
    slug: term.slug,
    summaryPlain: term.summaryPlain,
    summaryHtml: term.summaryHtml,
    type: term.type,
    docsLinks: term.docsLinks,
    section: undefined,
    craftVersion: undefined,
  };
}

function groupByLetter(items: DocsSearchResult[]) {
  const map = new Map<string, DocsSearchResult[]>();
  for (const item of items) {
    const first = (item.title?.trim()?.[0] || "").toUpperCase();
    const key = /^[A-Z]$/.test(first) ? first : "#";
    const arr = map.get(key);
    if (arr) arr.push(item);
    else map.set(key, [item]);
  }
  const keys = Array.from(map.keys()).sort((a, b) => {
    if (a === "#" && b !== "#") return 1;
    if (b === "#" && a !== "#") return -1;
    return a.localeCompare(b);
  });
  return { keys, map };
}
const ACTION_ICONS = {
  globe: { source: `${ASSETS_DIR}/world.svg`, tintColor: Color.SecondaryText },
  book: { source: `${ASSETS_DIR}/book.svg`, tintColor: Color.SecondaryText },
  clipboard: { source: `${ASSETS_DIR}/clipboard.svg`, tintColor: Color.SecondaryText },
  sidebar: { source: Icon.Sidebar, tintColor: Color.SecondaryText },
  bookmark: { source: ICONS.bookmarks, tintColor: Color.SecondaryText },
  removeBookmark: { source: ICONS.bookmarkOff, tintColor: Color.SecondaryText },
} as const;

function buildBookmarkAccessory(
  isBookmarked: boolean,
  selectedProduct: DocsProduct,
): List.Item.Accessory[] | undefined {
  if (!isBookmarked || selectedProduct === "bookmarks") return undefined;
  return [{ icon: { source: ICONS.bookmarks, tintColor: Color.SecondaryText }, tooltip: "Bookmarked" }];
}

function tintSecondaryIcon(source: string | Icon): { source: string | Icon; tintColor: Color } {
  return { source, tintColor: Color.SecondaryText };
}
