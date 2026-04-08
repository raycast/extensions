import {
  Action,
  ActionPanel,
  Cache,
  Clipboard,
  LocalStorage,
  closeMainWindow,
  environment,
  getPreferenceValues,
  Grid,
  Icon,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import Fuse from "fuse.js";
import { existsSync, mkdirSync, writeFileSync } from "fs";
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

const allCategoriesLabel = "All Categories";
const pageSize = 100;
const searchDebounceMs = 150;
const resultCache = new Cache({ namespace: "search-wojaks" });
const metadataTtlMs = 24 * 60 * 60 * 1000;
const metadataCacheKey = "wojak-picker.supabase-metadata.v1";
const imageCacheDirectory = join(environment.supportPath, "image-cache");

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

function getConfiguredPreferences() {
  const preferences = getPreferenceValues<Preferences.SearchWojaks>();

  return {
    supabaseUrl: preferences.supabaseUrl?.trim().replace(/\/$/, "") || "",
    supabaseAnonKey: preferences.supabaseAnonKey?.trim() || "",
    supabaseBucket: preferences.supabaseBucket?.trim() || "wojaks",
  };
}

function getCachePayload(rawValue?: string | null) {
  if (!rawValue) {
    return undefined;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    return undefined;
  }
}

type RemoteWojak = {
  id?: string;
  name?: string;
  category?: string;
  filename?: string;
  thumb_url?: string;
  thumbUrl?: string;
  full_url?: string;
  fullUrl?: string;
  source_page_url?: string;
  sourcePageUrl?: string;
};

function mapRemoteWojak(item: RemoteWojak): Wojak {
  const fullUrl = item.full_url || item.fullUrl || "";
  const thumbUrl = item.thumb_url || item.thumbUrl || buildThumbnailUrl(fullUrl);
  return {
    id: item.id || "",
    name: item.name || "",
    category: item.category || "",
    filename: item.filename || "",
    thumbUrl,
    fullUrl,
    sourcePageUrl: item.source_page_url || item.sourcePageUrl || "",
  };
}

function buildThumbnailUrl(fullUrl?: string) {
  if (!fullUrl) {
    return "";
  }

  const marker = "/storage/v1/object/public/";
  const markerIndex = fullUrl.indexOf(marker);

  if (markerIndex === -1) {
    return fullUrl;
  }

  const prefix = fullUrl.slice(0, markerIndex);
  const objectPath = fullUrl.slice(markerIndex + marker.length);
  return `${prefix}/storage/v1/render/image/public/${objectPath}?width=320&height=320&resize=contain&quality=80`;
}

async function fetchWojaksFromSupabase() {
  const { supabaseUrl, supabaseAnonKey } = getConfiguredPreferences();

  const response = await fetch(
    `${supabaseUrl}/rest/v1/wojaks?select=id,name,category,filename,thumb_url,full_url,source_page_url&order=name.asc`,
    {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    },
  );

  if (!response.ok) {
    throw new Error(`Supabase metadata fetch failed with HTTP ${response.status}`);
  }

  const data = (await response.json()) as RemoteWojak[];
  return data
    .map((item: RemoteWojak) => mapRemoteWojak(item))
    .filter((item: Wojak) => item.id && item.name && item.filename && item.fullUrl);
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

async function loadWojaks() {
  const cachedValue = getCachePayload(await LocalStorage.getItem<string>(metadataCacheKey));
  const cachedData = cachedValue?.data?.map?.(mapRemoteWojak).filter((item: Wojak) => item.id && item.fullUrl) ?? [];
  const isFresh = cachedValue?.expiresAt && Number(cachedValue.expiresAt) > Date.now();

  if (isFresh && cachedData.length > 0) {
    return { data: cachedData, source: "cache", stale: false };
  }

  try {
    const remoteData = await fetchWojaksFromSupabase();
    await LocalStorage.setItem(
      metadataCacheKey,
      JSON.stringify({
        expiresAt: Date.now() + metadataTtlMs,
        data: remoteData,
      }),
    );
    return { data: remoteData, source: "remote", stale: false };
  } catch (error) {
    if (cachedData.length > 0) {
      return { data: cachedData, source: "cache", stale: true };
    }

    throw error;
  }
}

async function ensureCachedImage(wojak: Wojak) {
  mkdirSync(imageCacheDirectory, { recursive: true });
  const assetPath = join(imageCacheDirectory, wojak.filename);

  if (existsSync(assetPath)) {
    return { assetPath, fromCache: true };
  }

  const response = await fetch(wojak.fullUrl);
  if (!response.ok) {
    throw new Error(`Image download failed with HTTP ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  writeFileSync(assetPath, Buffer.from(arrayBuffer));

  return { assetPath, fromCache: false };
}

export default function Command() {
  const preferences = getConfiguredPreferences();
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [isCopying, setIsCopying] = useState(false);
  const [isLoadingRemoteData, setIsLoadingRemoteData] = useState(true);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [wojaks, setWojaks] = useState<Wojak[]>([]);
  const {
    value: storedCategory,
    setValue: setStoredCategory,
    isLoading: isCategoryLoading,
  } = useStoredCategory();

  const isConfigured = Boolean(preferences.supabaseUrl && preferences.supabaseAnonKey);
  const { categories, categoryPools, getFuse, wojaksById } = useMemo(() => createSearchHelpers(wojaks), [wojaks]);
  const selectedCategory = categories.includes(storedCategory ?? "") ? storedCategory ?? allCategoriesLabel : allCategoriesLabel;

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
      if (!isConfigured) {
        setRemoteError("Set your Supabase preferences in Raycast to load the Wojak library.");
        setWojaks([]);
        setIsLoadingRemoteData(false);
        return;
      }

      setIsLoadingRemoteData(true);
      setRemoteError(null);

      try {
        const result = await loadWojaks();
        if (!cancelled) {
          setWojaks(result.data);
          setRemoteError(result.stale ? "Offline mode: showing cached metadata from the last successful sync." : null);
        }
      } catch (error) {
        if (!cancelled) {
          setRemoteError(error instanceof Error ? error.message : String(error));
          setWojaks([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingRemoteData(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [isConfigured, preferences.supabaseUrl, preferences.supabaseAnonKey, preferences.supabaseBucket]);

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
  }, [debouncedSearchText, selectedCategory]);

  const visibleWojaks = useMemo(() => {
    return filteredWojaks.slice(0, visibleCount);
  }, [filteredWojaks, visibleCount]);

  const hasMore = visibleWojaks.length < filteredWojaks.length;
  const isFiltering = searchText !== debouncedSearchText || isCategoryLoading || isLoadingRemoteData;

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
      {!isConfigured ? (
        <Grid.EmptyView
          icon={Icon.Gear}
          title="Supabase setup required"
          description="Set Supabase URL and anon key in this extension's preferences."
        />
      ) : remoteError && visibleWojaks.length === 0 ? (
        <Grid.EmptyView icon={Icon.ExclamationMark} title="Couldn't load wojaks" description={remoteError} />
      ) : visibleWojaks.length === 0 ? (
        <Grid.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No wojaks found"
          description={remoteError || "Try a different search term or category."}
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
                <Action
                  title="Copy Image to Clipboard"
                  icon={Icon.Clipboard}
                  onAction={() => handleCopy(wojak)}
                />
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
