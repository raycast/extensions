import {
  Action,
  ActionPanel,
  Cache,
  Clipboard,
  LocalStorage,
  closeMainWindow,
  environment,
  Grid,
  Icon,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import Fuse from "fuse.js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import React, { useEffect, useMemo, useState } from "react";

type Wojak = {
  id: string;
  category: string;
  filename: string;
  thumbUrl: string;
  fullUrl: string;
  name: string;
  sourcePageUrl?: string;
};

type ManifestWojak = {
  id?: string;
  name?: string;
  category?: string;
  filename?: string;
  thumbUrl?: string;
  fullUrl?: string;
  sourcePageUrl?: string;
};

const allCategoriesLabel = "All Categories";
const pageSize = 100;
const searchDebounceMs = 150;
const resultCache = new Cache({ namespace: "search-wojaks" });
const metadataTtlMs = 24 * 60 * 60 * 1000;
const metadataCacheKey = "wojak-picker.metadata.v1";
const imageCacheDirectory = join(environment.supportPath, "image-cache");
const manifestPath = join(environment.assetsPath, "wojaks.json");

function createFuse(items: Wojak[]) {
  return new Fuse(items, {
    keys: [
      { name: "name", weight: 0.7 },
      { name: "category", weight: 0.2 },
      { name: "filename", weight: 0.1 },
    ],
    threshold: 0.3,
    includeScore: true,
    minMatchCharLength: 2,
  });
}

function createSearchHelpers(wojaks: Wojak[]) {
  const categories = [allCategoriesLabel, ...Array.from(new Set(wojaks.map((wojak) => wojak.category))).sort()];
  const categoryPools = new Map(
    categories.map((category) => [
      category,
      category === allCategoriesLabel ? wojaks : wojaks.filter((wojak) => wojak.category === category),
    ]),
  );
  const fuseByCategory = new Map();
  const wojaksById = new Map(wojaks.map((wojak) => [wojak.id, wojak]));

  function getFuse(category: string) {
    if (!fuseByCategory.has(category)) {
      const pool = categoryPools.get(category) ?? wojaks;
      fuseByCategory.set(category, createFuse(pool));
    }

    return fuseByCategory.get(category);
  }

  return { categories, categoryPools, getFuse, wojaksById };
}

function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

function getCachedSearchResults(cacheKey: string, wojaksById: Map<string, Wojak>) {
  const cached = resultCache.get(cacheKey);
  if (!cached) {
    return undefined;
  }

  try {
    return JSON.parse(cached)
      .map((id: string) => wojaksById.get(id))
      .filter(Boolean);
  } catch {
    resultCache.remove(cacheKey);
    return undefined;
  }
}

function mapManifestWojak(item: ManifestWojak): Wojak {
  return {
    id: item.id || "",
    name: item.name || "",
    category: item.category || "",
    filename: item.filename || "",
    thumbUrl: item.thumbUrl || item.fullUrl || "",
    fullUrl: item.fullUrl || "",
    sourcePageUrl: item.sourcePageUrl || "",
  };
}

function loadWojaksFromManifest() {
  if (!existsSync(manifestPath)) {
    throw new Error('Missing assets/wojaks.json. Run "npm run scrape" in the extension folder, then restart dev.');
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as ManifestWojak[];
  return manifest
    .map((item) => mapManifestWojak(item))
    .filter((item) => item.id && item.name && item.filename && item.fullUrl);
}

function getCachePayload(rawValue?: string | null) {
  if (!rawValue) {
    return undefined;
  }

  try {
    return JSON.parse(rawValue) as { expiresAt?: number; data?: Wojak[] };
  } catch {
    return undefined;
  }
}

async function request(url: string, context: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${context} (HTTP ${response.status})`);
  }

  return response;
}

async function loadWojaks() {
  const cachedValue = getCachePayload(await LocalStorage.getItem<string>(metadataCacheKey));
  const isFresh = cachedValue?.expiresAt && cachedValue.expiresAt > Date.now();

  if (isFresh && cachedValue?.data?.length) {
    return { data: cachedValue.data, stale: false };
  }

  const data = loadWojaksFromManifest();
  await LocalStorage.setItem(
    metadataCacheKey,
    JSON.stringify({
      expiresAt: Date.now() + metadataTtlMs,
      data,
    }),
  );

  return { data, stale: false };
}

async function ensureCachedImage(wojak: Wojak) {
  mkdirSync(imageCacheDirectory, { recursive: true });
  const assetPath = join(imageCacheDirectory, wojak.filename);

  if (existsSync(assetPath)) {
    return { assetPath, fromCache: true };
  }

  const response = await request(wojak.fullUrl, "Image download failed");
  const arrayBuffer = await response.arrayBuffer();
  writeFileSync(assetPath, Buffer.from(arrayBuffer));

  return { assetPath, fromCache: false };
}

function useStoredCategory() {
  const [value, setValue] = useState(allCategoriesLabel);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const storedValue = await LocalStorage.getItem<string>("wojak-picker.selected-category");
      if (!cancelled && storedValue) {
        setValue(storedValue);
      }
      if (!cancelled) {
        setIsLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function setStoredValue(nextValue: string) {
    setValue(nextValue);
    await LocalStorage.setItem("wojak-picker.selected-category", nextValue);
  }

  return { value, setValue: setStoredValue, isLoading };
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [isCopying, setIsCopying] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [wojaks, setWojaks] = useState<Wojak[]>([]);
  const { value: storedCategory, setValue: setStoredCategory, isLoading: isCategoryLoading } = useStoredCategory();

  const { categories, categoryPools, getFuse, wojaksById } = useMemo(() => createSearchHelpers(wojaks), [wojaks]);
  const selectedCategory = categories.includes(storedCategory ?? "")
    ? (storedCategory ?? allCategoriesLabel)
    : allCategoriesLabel;

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, searchDebounceMs);

    return () => clearTimeout(timeout);
  }, [searchText]);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [debouncedSearchText, selectedCategory]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setIsLoadingData(true);
      setLoadError(null);

      try {
        const result = await loadWojaks();
        if (!cancelled) {
          setWojaks(result.data);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : String(error));
          setWojaks([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingData(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredWojaks = useMemo(() => {
    const pool = categoryPools.get(selectedCategory) ?? wojaks;
    const normalizedQuery = normalizeQuery(debouncedSearchText);

    if (!normalizedQuery) {
      return pool;
    }

    const cacheKey = `${selectedCategory}::${normalizedQuery}`;
    const cachedResults = getCachedSearchResults(cacheKey, wojaksById);
    if (cachedResults !== undefined && cachedResults.length > 0) {
      return cachedResults;
    }

    const categoryResults = getFuse(selectedCategory)
      .search(normalizedQuery)
      .map((result: { item: Wojak }) => result.item);

    if (categoryResults.length > 0 || selectedCategory === allCategoriesLabel) {
      resultCache.set(cacheKey, JSON.stringify(categoryResults.map((wojak: Wojak) => wojak.id)));
      return categoryResults;
    }

    const fallbackCacheKey = `${allCategoriesLabel}::${normalizedQuery}`;
    const fallbackCachedResults = getCachedSearchResults(fallbackCacheKey, wojaksById);
    if (fallbackCachedResults !== undefined && fallbackCachedResults.length > 0) {
      resultCache.set(cacheKey, JSON.stringify(fallbackCachedResults.map((wojak: Wojak) => wojak.id)));
      return fallbackCachedResults;
    }

    const fallbackResults = getFuse(allCategoriesLabel)
      .search(normalizedQuery)
      .map((result: { item: Wojak }) => result.item);

    resultCache.set(fallbackCacheKey, JSON.stringify(fallbackResults.map((wojak: Wojak) => wojak.id)));
    resultCache.set(cacheKey, JSON.stringify(fallbackResults.map((wojak: Wojak) => wojak.id)));
    return fallbackResults;
  }, [debouncedSearchText, selectedCategory, categoryPools, getFuse, wojaks, wojaksById]);

  const visibleWojaks = useMemo(() => {
    return filteredWojaks.slice(0, visibleCount);
  }, [filteredWojaks, visibleCount]);

  const hasMore = visibleWojaks.length < filteredWojaks.length;
  const isFiltering = searchText !== debouncedSearchText || isCategoryLoading || isLoadingData;

  async function handleCopy(wojak: Wojak) {
    setIsCopying(true);

    try {
      const { assetPath, fromCache } = await ensureCachedImage(wojak);
      await Clipboard.copy({ file: assetPath });
      await closeMainWindow();
      await showHUD(fromCache ? `Copied ${wojak.name}` : `Downloaded and copied ${wojak.name}`);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Couldn't copy ${wojak.name}`,
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsCopying(false);
    }
  }

  return (
    <Grid
      columns={6}
      inset={Grid.Inset.Small}
      isLoading={isCopying || isFiltering}
      searchBarPlaceholder="Search wojaks by name or category"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      pagination={{
        pageSize,
        hasMore,
        onLoadMore: () => setVisibleCount((current) => current + pageSize),
      }}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Filter by category"
          storeValue
          onChange={(category) => void setStoredCategory(category)}
          value={selectedCategory}
        >
          {categories.map((category) => (
            <Grid.Dropdown.Item key={category} title={category} value={category} />
          ))}
        </Grid.Dropdown>
      }
    >
      {loadError && visibleWojaks.length === 0 ? (
        <Grid.EmptyView icon={Icon.ExclamationMark} title="Couldn't load wojaks" description={loadError} />
      ) : visibleWojaks.length === 0 ? (
        <Grid.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No wojaks found"
          description="Try a different search term or category."
        />
      ) : (
        visibleWojaks.map((wojak: Wojak) => (
          <Grid.Item
            key={wojak.id}
            id={wojak.id}
            content={{ source: wojak.thumbUrl || wojak.fullUrl }}
            title={wojak.name}
            subtitle={wojak.category}
            keywords={[wojak.name, wojak.category, wojak.filename]}
            actions={
              <ActionPanel>
                <Action title="Copy Image to Clipboard" icon={Icon.Clipboard} onAction={() => handleCopy(wojak)} />
                <Action.CopyToClipboard
                  title="Copy Source URL"
                  content={wojak.fullUrl}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
                <Action.OpenInBrowser
                  title="Open Source Image"
                  url={wojak.fullUrl}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
                {wojak.sourcePageUrl ? (
                  <Action.OpenInBrowser
                    title="Open Category Page"
                    url={wojak.sourcePageUrl}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                  />
                ) : null}
              </ActionPanel>
            }
          />
        ))
      )}
    </Grid>
  );
}
