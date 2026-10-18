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

import { createSavedEmotesStore } from "./saved-emotes";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [items, setItems] = useState<Emote[]>([]);
  const [favorites, setFavorites] = useState<Emote[]>([]);
  const [history, setHistory] = useState<Emote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGridView, setIsGridView] = useState(true);
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
  const [selection, setSelection] = useState("7tv:popular");
  const [provider, sortMode] = selection.split(":") as [Provider, SortMode];
  const [animatedOnly, setAnimatedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState<number>();
  const [hasMore, setHasMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const providerTitle = PROVIDERS.find((p) => p.id === provider)!.title;
  const resultsTitle = `${providerTitle} · ${getSortTitle(provider, sortMode, searchText)}`;
  const resultCount =
    total === undefined
      ? `${items.length} loaded`
      : `${items.length} of ${total.toLocaleString()}`;

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
    const fetchId = ++fetchIdRef.current;
    const controller = new AbortController();
    setIsLoading(true);
    setErrorMessage(undefined);
    const timeout = setTimeout(async () => {
      try {
        const result = await searchEmotes(
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
    if (provider === "bttv" && text.trim()) setSelection("bttv:popular");
    setSearchText(text);
  }
  function changeSelection(value: string) {
    if (value === selection) return;
    resetResults();
    setSelection(value);
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

  async function pasteEmote(item: Emote, mode: "file" | "url" = "file") {
    const { url, ext } = getEmoteFile(item);
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
        `vault_${item.provider ?? "7tv"}_${safeName}_${item.id}.${ext}`,
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
        setAnimatedOnly((value) => !value);
      }}
    />
  );

  const renderActions = (item: Emote) => {
    const isFav = favorites.some((f) => getEmoteKey(f) === getEmoteKey(item));
    const { url: highResUrl, ext } = getEmoteFile(item);
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
                  `copy_${item.provider ?? "7tv"}_${safeName}_${item.id}.${ext}`,
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
        </ActionPanel.Section>
        <ActionPanel.Section>
          {renderFilterAction()}
          <Action
            title="Reload Results"
            icon={Icon.ArrowClockwise}
            onAction={() => {
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
            onAction={() => setIsGridView(!isGridView)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
          />
          <Action.CopyToClipboard
            title="Copy ID"
            content={item.id}
            shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
          />
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
  const localItems = (data: Emote[]) =>
    data.filter(
      (e) =>
        (e.provider ?? "7tv") === provider && (!animatedOnly || e.animated),
    );
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

  if (isGridView) {
    return (
      <Grid
        isLoading={isLoading}
        onSearchTextChange={changeSearch}
        searchText={searchText}
        filtering={false}
        pagination={pagination}
        searchBarPlaceholder={`Search ${providerTitle} Emotes...`}
        searchBarAccessory={
          <Grid.Dropdown
            tooltip="Provider & Sort"
            value={selection}
            onChange={changeSelection}
          >
            {dropdownSections(Grid.Dropdown)}
          </Grid.Dropdown>
        }
        columns={6}
        fit={Grid.Fit.Contain}
      >
        {!searchText &&
          favorites.length > 0 &&
          renderGridItems(localItems(favorites), "Starred Emotes")}
        {!searchText &&
          history.length > 0 &&
          renderGridItems(localItems(history), "Recently Used")}
        {renderGridItems(items, resultsTitle)}
        {items.length === 0 && (
          <Grid.EmptyView
            title={
              errorMessage
                ? "Search Failed"
                : isLoading
                  ? "Loading Emotes"
                  : "No Emotes Found"
            }
            description={
              errorMessage ?? "Try another name, provider, or filter."
            }
            actions={
              <ActionPanel>
                <Action
                  title="Retry Search"
                  onAction={() => setRetry((value) => value + 1)}
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
      searchBarPlaceholder={`Search ${providerTitle} Emotes...`}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Provider & Sort"
          value={selection}
          onChange={changeSelection}
        >
          {dropdownSections(List.Dropdown)}
        </List.Dropdown>
      }
      throttle
    >
      {!searchText &&
        favorites.length > 0 &&
        renderListItems(localItems(favorites), "Starred Emotes")}
      {!searchText &&
        history.length > 0 &&
        renderListItems(localItems(history), "Recently Used")}
      {renderListItems(items, resultsTitle)}
      {items.length === 0 && (
        <List.EmptyView
          title={
            errorMessage
              ? "Search Failed"
              : isLoading
                ? "Loading Emotes"
                : "No Emotes Found"
          }
          description={errorMessage ?? "Try another name, provider, or filter."}
          actions={
            <ActionPanel>
              <Action
                title="Retry Search"
                onAction={() => setRetry((value) => value + 1)}
              />
              {renderFilterAction()}
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
