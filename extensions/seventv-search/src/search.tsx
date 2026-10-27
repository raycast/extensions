import {
  List,
  Grid,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  Image,
  Clipboard,
  LocalStorage,
  getPreferenceValues,
  Cache,
  Detail,
} from "@raycast/api";
import React, { useState, useEffect, useRef } from "react";
import { writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

import {
  type Emote,
  type Provider,
  type SortMode,
  PAGE_SIZE,
  BTTV_PAGE_SIZE,
  PROVIDERS,
  getSortTitle,
  searchEmotes,
  getEmoteKey,
  getEmoteFile,
  getPreviewUrl,
  getEmotePage,
} from "./providers";

import { type UserEmoteSource, getUsageDescription } from "./user-emotes";

import { createSavedEmotesStore } from "./saved-emotes";
import {
  type SearchPreferences,
  DEFAULT_SEARCH_PREFERENCES,
  createSearchPreferencesStore,
  getSavedEmoteMatches,
} from "./search-state";

const GRID_COLUMNS = { small: 8, medium: 6, large: 4 };
type GridSize = keyof typeof GRID_COLUMNS;
const cache = new Cache();

const validSelections = PROVIDERS.flatMap((provider) =>
  provider.sorts.map((sort) => `${provider.id}:${sort}`),
);

export function EmoteBrowser({ source }: { source?: UserEmoteSource }) {
  const extensionPreferences = getPreferenceValues<Preferences>();
  const defaultSize = Number(extensionPreferences.size);

  // A Grid Size picked from the Action Panel is kept until the preference itself changes.
  const [gridSize, setGridSize] = useState<GridSize>(() => {
    const saved = JSON.parse(cache.get("gridSize") ?? "null");
    if (saved?.preference === extensionPreferences.gridSize) return saved.value;
    cache.remove("gridSize");
    return extensionPreferences.gridSize;
  });

  const changeGridSize = (value: GridSize) => {
    setGridSize(value);
    cache.set(
      "gridSize",
      JSON.stringify({
        preference: extensionPreferences.gridSize,
        value,
      }),
    );
  };

  const [searchText, setSearchText] = useState("");
  const [items, setItems] = useState<Emote[]>([]);
  const [favorites, setFavorites] = useState<Emote[]>([]);
  const [history, setHistory] = useState<Emote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState<SearchPreferences>();
  const { isGridView, selection, animatedOnly } =
    preferences ?? DEFAULT_SEARCH_PREFERENCES;
  const preferencesLoaded = preferences !== undefined;
  const preferencesStoreRef =
    useRef<ReturnType<typeof createSearchPreferencesStore>>(undefined);
  preferencesStoreRef.current ??= createSearchPreferencesStore(
    {
      getItem: (key) => LocalStorage.getItem<string>(key),
      setItem: (key, value) => LocalStorage.setItem(key, value),
    },
    validSelections,
  );
  const savedStoreRef =
    useRef<ReturnType<typeof createSavedEmotesStore>>(undefined);
  savedStoreRef.current ??= createSavedEmotesStore(
    {
      getItem: (key) => LocalStorage.getItem<string>(key),
      setItem: (key, value) => LocalStorage.setItem(key, value),
    },
    getEmoteKey,
  );
  const fetchIdRef = useRef(0);
  const nextCursorRef = useRef<string>(undefined);

  const [retry, setRetry] = useState(0);
  const [selectedProvider, selectedSort] = selection.split(":") as [
    Provider,
    SortMode,
  ];
  const provider = source ? "7tv" : selectedProvider;
  const sortMode = source ? "popular" : selectedSort;
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState<number>();
  const [hasMore, setHasMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const providerTitle = PROVIDERS.find((p) => p.id === provider)!.title;
  const resultsTitle =
    source?.title ??
    `${providerTitle} · ${getSortTitle(provider, sortMode, searchText)}`;
  const resultCount =
    total === undefined
      ? `${items.length} loaded`
      : `${items.length} of ${total.toLocaleString()}`;

  useEffect(() => {
    let active = true;
    preferencesStoreRef
      .current!.load()
      .then((saved) => {
        if (active) setPreferences(saved);
      })
      .catch((error) => {
        if (!active) return;
        setPreferences({ ...DEFAULT_SEARCH_PREFERENCES });
        void showToast({
          style: Toast.Style.Failure,
          title: "Could Not Restore View Preferences",
          message: String(error),
        });
      });
    return () => {
      active = false;
    };
  }, []);

  function updatePreferences(patch: Partial<SearchPreferences>) {
    setPreferences((previous) => ({
      ...(previous ?? DEFAULT_SEARCH_PREFERENCES),
      ...patch,
    }));
    void preferencesStoreRef.current!.update(patch).catch((error) => {
      void showToast({
        style: Toast.Style.Failure,
        title: "Could Not Save View Preferences",
        message: String(error),
      });
    });
  }

  useEffect(() => {
    let active = true;
    savedStoreRef
      .current!.load()
      .then((saved) => {
        if (!active) return;
        setFavorites(saved.favorites);
        setHistory(saved.history);
      })
      .catch((error) => {
        if (active)
          void showToast({
            style: Toast.Style.Failure,
            title: "Could Not Load Saved Emotes",
            message: String(error),
          });
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) return;
    const fetchId = ++fetchIdRef.current;
    const controller = new AbortController();
    setIsLoading(true);
    setErrorMessage(undefined);
    const timeout = setTimeout(async () => {
      try {
        const result = await (source?.load ?? searchEmotes)(
          {
            provider,
            sort: sortMode,
            query: searchText.trim(),
            page,
            animatedOnly,
            cursor: nextCursorRef.current,
          },
          controller.signal,
        );
        if (fetchId !== fetchIdRef.current) return;
        setItems((previous) => {
          const combined =
            page === 1 ? result.items : [...previous, ...result.items];
          return [
            ...new Map(combined.map((e) => [getEmoteKey(e), e])).values(),
          ];
        });
        nextCursorRef.current = result.nextCursor;
        setTotal(result.total);
        setHasMore(result.hasMore);
      } catch (error) {
        if (controller.signal.aborted || fetchId !== fetchIdRef.current) return;
        setHasMore(false);
        setErrorMessage(String(error));
        await showToast({
          style: Toast.Style.Failure,
          title: `${providerTitle} Error`,
          message: String(error),
        });
      } finally {
        if (fetchId === fetchIdRef.current) setIsLoading(false);
      }
    }, 300);
    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [
    preferencesLoaded,
    source,
    searchText,
    provider,
    sortMode,
    page,
    animatedOnly,
    providerTitle,
    retry,
  ]);

  function resetResults() {
    // Invalidate in-flight responses before React commits the changed selection.
    fetchIdRef.current += 1;
    nextCursorRef.current = undefined;
    setItems([]);
    setTotal(undefined);
    setHasMore(false);
    setErrorMessage(undefined);
    setPage(1);
  }

  function changeSearch(text: string) {
    if (text === searchText) return;
    resetResults();
    if (provider === "bttv" && text.trim() && selection !== "bttv:popular")
      updatePreferences({ selection: "bttv:popular" });
    setSearchText(text);
  }

  function changeSelection(value: string) {
    if (value === selection) return;
    resetResults();
    updatePreferences({ selection: value });
  }

  async function addToHistory(item: Emote) {
    try {
      const saved = await savedStoreRef.current!.recordRecent(item);
      setHistory(saved.history);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Save Recent Emote",
        message: String(error),
      });
    }
  }

  async function toggleFavorite(item: Emote) {
    try {
      const saved = await savedStoreRef.current!.toggleFavorite(item);
      setFavorites(saved.favorites);
      const isFavorite = saved.favorites.some(
        (e) => getEmoteKey(e) === getEmoteKey(item),
      );
      await showToast({
        title: isFavorite ? "Added to Favorites" : "Removed from Favorites",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Save Favorite",
        message: String(error),
      });
    }
  }

  async function pasteEmote(
    item: Emote,
    mode: "file" | "url" = "file",
    size = defaultSize,
  ) {
    const { url, ext } = getEmoteFile(item, size);
    await addToHistory(item);

    if (mode === "url") {
      await Clipboard.paste(url);
      await showToast({ title: "URL Pasted" });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Pasting Emote...",
    });
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Download failed");

      const arrayBuffer = await res.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);

      const safeName = item.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      const tempPath = join(
        tmpdir(),
        `vault_${item.provider ?? "7tv"}_${safeName}_${item.id}_${size}x.${ext}`,
      );
      await writeFile(tempPath, data);

      try {
        await Clipboard.copy({
          file: tempPath,
          html: `<img src="${url}" alt="${item.name}" />`,
        });

        await Clipboard.paste({ file: tempPath });

        toast.style = Toast.Style.Success;
        toast.title = "Emote Pasted";
      } catch (clipError) {
        console.error("Paste failed:", clipError);
        await Clipboard.paste(url);
        toast.style = Toast.Style.Success;
        toast.title = "URL Pasted (Fallback)";
      }
    } catch (e) {
      console.error("Critical Error:", e);
      await Clipboard.paste(url);
      toast.style = Toast.Style.Success;
      toast.title = "URL Pasted (Error Fallback)";
    }
  }

  const renderFilterAction = () => (
    <Action
      title={animatedOnly ? "Show All Emotes" : "Show Animated Only"}
      icon={Icon.Filter}
      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
      onAction={() => {
        resetResults();
        updatePreferences({ animatedOnly: !animatedOnly });
      }}
    />
  );

  const renderActions = (item: Emote) => {
    const isFav = favorites.some((f) => getEmoteKey(f) === getEmoteKey(item));
    const { url: highResUrl, ext } = getEmoteFile(item, defaultSize);
    const markdown = `![${item.name}](${highResUrl})`;

    return (
      <ActionPanel>
        <ActionPanel.Section>
          <Action
            title="Paste Emote File"
            icon={Icon.Clipboard}
            onAction={() => pasteEmote(item)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
          />
          <Action
            title={isFav ? "Unstar Emote" : "Star Emote"}
            icon={isFav ? Icon.StarDisabled : Icon.Star}
            onAction={() => toggleFavorite(item)}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
        </ActionPanel.Section>

        <ActionPanel.Section>
          <Action
            title="Paste Emote URL"
            icon={Icon.Link}
            onAction={() => pasteEmote(item, "url")}
            shortcut={{ modifiers: ["cmd"], key: "u" }}
          />
          <Action.CopyToClipboard title="Copy Emote URL" content={highResUrl} />
          <Action.CopyToClipboard
            title="Copy as Markdown"
            content={markdown}
            shortcut={{ modifiers: ["cmd"], key: "m" }}
          />
          <Action
            title="Copy Emote File"
            icon={Icon.Download}
            onAction={async () => {
              const toast = await showToast({
                style: Toast.Style.Animated,
                title: "Downloading Emote...",
              });
              try {
                const res = await fetch(highResUrl);
                if (!res.ok) throw new Error("Download failed");
                const data = new Uint8Array(await res.arrayBuffer());
                const safeName = item.name
                  .replace(/[^a-z0-9]/gi, "_")
                  .toLowerCase();
                const tempPath = join(
                  tmpdir(),
                  `copy_${item.provider ?? "7tv"}_${safeName}_${item.id}_${defaultSize}x.${ext}`,
                );
                await writeFile(tempPath, data);
                await Clipboard.copy({ file: tempPath });
                toast.style = Toast.Style.Success;
                toast.title = "File Copied";
                toast.message = "Ready to paste (Cmd+V)";
              } catch (e) {
                toast.style = Toast.Style.Failure;
                toast.title = "Copy Failed";
                toast.message = String(e);
              }
            }}
          />
          <ActionPanel.Submenu title="Paste Emote at Size" icon={Icon.Maximize}>
            {[1, 2, 3, 4].map((size) => (
              <Action
                key={size}
                title={`${size}×`}
                onAction={() => pasteEmote(item, "file", size)}
              />
            ))}
          </ActionPanel.Submenu>
        </ActionPanel.Section>

        <ActionPanel.Section>
          {renderFilterAction()}
          <Action
            title="Reload Results"
            icon={Icon.ArrowClockwise}
            onAction={() => {
              source?.invalidate?.();
              resetResults();
              setRetry((value) => value + 1);
            }}
          />
          <Action.OpenInBrowser
            title="View on Provider"
            url={getEmotePage(item)}
          />
          <Action
            title={isGridView ? "Switch to List View" : "Switch to Grid View"}
            icon={isGridView ? Icon.List : Icon.AppWindowGrid3x3}
            onAction={() => updatePreferences({ isGridView: !isGridView })}
            shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
          />
          <Action.CopyToClipboard
            title="Copy ID"
            content={item.id}
            shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
          />
          {item.usage && (
            <Action.Push
              title="View 7TV Usage Status"
              icon={Icon.Info}
              target={
                <Detail
                  markdown={`# 7TV Usage Status

${getUsageDescription(item.usage)}

This status applies to 7TV personal emote sets. It does not describe general permission to reuse the image elsewhere.

- Public listing: ${item.usage.publicListed ? "Listed" : "Unlisted"}
- Private: ${item.usage.private ? "Yes" : "No"}

[View emote on 7TV](${getEmotePage(item)})`}
                />
              }
            />
          )}
          {isGridView && (
            <ActionPanel.Submenu title="Grid Size" icon={Icon.AppWindowGrid3x3}>
              {(["small", "medium", "large"] as const).map((value) => (
                <Action
                  key={value}
                  title={value[0].toUpperCase() + value.slice(1)}
                  icon={value === gridSize ? Icon.Checkmark : undefined}
                  onAction={() => changeGridSize(value)}
                />
              ))}
            </ActionPanel.Submenu>
          )}
        </ActionPanel.Section>
      </ActionPanel>
    );
  };

  const dropdownSections = (
    Dropdown: typeof List.Dropdown | typeof Grid.Dropdown,
  ) =>
    PROVIDERS.map((source) => (
      <Dropdown.Section key={source.id} title={source.title}>
        {(source.id === "bttv" && searchText.trim()
          ? ["popular" as SortMode]
          : source.sorts
        ).map((sort) => (
          <Dropdown.Item
            key={sort}
            title={`${source.title} · ${getSortTitle(source.id, sort, searchText)}`}
            value={`${source.id}:${sort}`}
          />
        ))}
      </Dropdown.Section>
    ));

  const savedMatches = source
    ? { favorites: [], history: [] }
    : getSavedEmoteMatches(
        favorites,
        history,
        { provider, query: searchText, animatedOnly },
        getEmoteKey,
      );
  const hasSavedMatches =
    savedMatches.favorites.length > 0 || savedMatches.history.length > 0;

  const pagination = {
    pageSize: provider === "bttv" ? BTTV_PAGE_SIZE : PAGE_SIZE,
    hasMore,
    onLoadMore: () => {
      if (!isLoading && hasMore) setPage((value) => value + 1);
    },
  };

  const renderGridItems = (data: Emote[], title: string) => (
    <Grid.Section
      title={title}
      subtitle={title === resultsTitle ? resultCount : undefined}
    >
      {data.map((item) => (
        <Grid.Item
          key={`${title}-${getEmoteKey(item)}`}
          title={item.name}
          subtitle={item.owner?.display_name}
          content={{ source: getPreviewUrl(item) }}
          actions={renderActions(item)}
        />
      ))}
    </Grid.Section>
  );

  const renderListItems = (data: Emote[], title: string) => (
    <List.Section
      title={title}
      subtitle={title === resultsTitle ? resultCount : undefined}
    >
      {data.map((item) => (
        <List.Item
          key={`${title}-${getEmoteKey(item)}`}
          title={item.name}
          subtitle={item.owner?.display_name || "Community"}
          icon={{
            source: getPreviewUrl(item),
            mask: Image.Mask.RoundedRectangle,
          }}
          actions={renderActions(item)}
        />
      ))}
    </List.Section>
  );

  if (!preferences)
    return (
      <List isLoading searchBarPlaceholder="Restoring view preferences..." />
    );

  if (isGridView) {
    return (
      <Grid
        isLoading={isLoading}
        onSearchTextChange={changeSearch}
        searchText={searchText}
        filtering={false}
        pagination={pagination}
        navigationTitle={source?.title}
        searchBarPlaceholder={
          source
            ? "Search These Emotes..."
            : `Search ${providerTitle} Emotes...`
        }
        searchBarAccessory={
          source ? undefined : (
            <Grid.Dropdown
              tooltip="Provider & Sort"
              value={selection}
              onChange={changeSelection}
            >
              {dropdownSections(Grid.Dropdown)}
            </Grid.Dropdown>
          )
        }
        columns={GRID_COLUMNS[gridSize]}
        inset={gridSize === "small" ? Grid.Inset.Small : undefined}
        fit={Grid.Fit.Contain}
      >
        {savedMatches.favorites.length > 0 &&
          renderGridItems(savedMatches.favorites, "Starred Emotes")}
        {savedMatches.history.length > 0 &&
          renderGridItems(savedMatches.history, "Recently Used")}
        {renderGridItems(items, resultsTitle)}
        {items.length === 0 && !hasSavedMatches && (
          <Grid.EmptyView
            title={
              errorMessage
                ? "Search Failed"
                : isLoading
                  ? "Loading Emotes"
                  : "No Emotes Found"
            }
            description={
              errorMessage ??
              source?.emptyDescription ??
              "Try another name, provider, or filter."
            }
            actions={
              <ActionPanel>
                <Action
                  title="Retry Search"
                  icon={Icon.ArrowClockwise}
                  onAction={() => {
                    source?.invalidate?.();
                    resetResults();
                    setRetry((value) => value + 1);
                  }}
                />
                {renderFilterAction()}
              </ActionPanel>
            }
          />
        )}
      </Grid>
    );
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={changeSearch}
      searchText={searchText}
      filtering={false}
      pagination={pagination}
      navigationTitle={source?.title}
      searchBarPlaceholder={
        source ? "Search These Emotes..." : `Search ${providerTitle} Emotes...`
      }
      searchBarAccessory={
        source ? undefined : (
          <List.Dropdown
            tooltip="Provider & Sort"
            value={selection}
            onChange={changeSelection}
          >
            {dropdownSections(List.Dropdown)}
          </List.Dropdown>
        )
      }
      throttle
    >
      {savedMatches.favorites.length > 0 &&
        renderListItems(savedMatches.favorites, "Starred Emotes")}
      {savedMatches.history.length > 0 &&
        renderListItems(savedMatches.history, "Recently Used")}
      {renderListItems(items, resultsTitle)}
      {items.length === 0 && !hasSavedMatches && (
        <List.EmptyView
          title={
            errorMessage
              ? "Search Failed"
              : isLoading
                ? "Loading Emotes"
                : "No Emotes Found"
          }
          description={
            errorMessage ??
            source?.emptyDescription ??
            "Try another name, provider, or filter."
          }
          actions={
            <ActionPanel>
              <Action
                title="Retry Search"
                icon={Icon.ArrowClockwise}
                onAction={() => {
                  source?.invalidate?.();
                  resetResults();
                  setRetry((value) => value + 1);
                }}
              />
              {renderFilterAction()}
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

export default function Command() {
  return <EmoteBrowser />;
}
