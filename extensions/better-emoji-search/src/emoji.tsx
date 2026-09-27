import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  closeMainWindow,
  environment,
  getPreferenceValues,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useEffect, useMemo, useRef } from "react";
import type { ReactElement } from "react";
import { loadCatalog, resolveRecents } from "./catalog";
import { RecentEmojiStorage } from "./recent-storage";
import { EmojiSearchIndex, SearchableEmoji } from "./search";

const { primaryAction, unicodeVersion, shortCodes } = getPreferenceValues<Preferences>();
const allEmojis = "All Emojis";
const recentlyUsedCategory = "Recently Used";
type Emoji = SearchableEmoji;
const recentStorage = new RecentEmojiStorage(LocalStorage);
const getEmojipediaLink = (description: string) =>
  "https://emojipedia.org/" + description.toLowerCase().replace(/:? /g, "-") + "/";

export default function Main(): ReactElement {
  const [list, setList] = useState<Emoji[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string>();
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [loadingRecents, setLoadingRecents] = useState(true);
  const [showCatalogAfterRecents, setShowCatalogAfterRecents] = useState(false);
  const [reload, setReload] = useState(0);
  const usingEmoji = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    setCatalogError(undefined);
    loadCatalog(environment.assetsPath, unicodeVersion)
      .then((items) => {
        if (!cancelled) setList(items);
      })
      .catch((error: unknown) => {
        if (!cancelled) setCatalogError(error instanceof Error ? error.message : "Could not load emojis");
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  useEffect(() => {
    let cancelled = false;
    recentStorage
      .load()
      .then((ids) => {
        if (!cancelled) setRecentIds(ids);
      })
      .catch(() => {
        if (!cancelled) void showToast({ style: Toast.Style.Failure, title: "Could not load recent emoji history" });
      })
      .finally(() => {
        if (!cancelled) setLoadingRecents(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const recentlyUsed = useMemo(() => resolveRecents(recentIds, list), [recentIds, list]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const category =
    selectedCategory ?? (searchText.trim() || (!loadingRecents && recentIds.length === 0) ? "" : recentlyUsedCategory);
  const searchIndex = useMemo(() => new EmojiSearchIndex(list), [list]);
  const recentSearchIndex = useMemo(() => new EmojiSearchIndex(recentlyUsed), [recentlyUsed]);
  const filteredEmojis = useMemo(
    () =>
      category === recentlyUsedCategory
        ? recentSearchIndex.search(searchText, { recentlyUsed })
        : searchIndex.search(searchText, { category, recentlyUsed }),
    [category, recentSearchIndex, recentlyUsed, searchIndex, searchText],
  );
  const categories = useMemo(() => {
    const icons = new Map<string, string>();
    for (const item of list) if (item.category && !icons.has(item.category)) icons.set(item.category, item.emoji);
    return [...icons].map(([category, icon]) => ({ category, icon }));
  }, [list]);
  const isRecentsView = category === recentlyUsedCategory && !searchText.trim();
  const showAllBelowRecents = isRecentsView && showCatalogAfterRecents;
  const allBelowRecents = useMemo(() => {
    const recent = new Set(recentIds);
    return list.filter((emoji) => !recent.has(emoji.emoji));
  }, [list, recentIds]);
  const isLoading = category === recentlyUsedCategory ? loadingRecents : catalogLoading;

  useEffect(() => {
    if (!isRecentsView || loadingRecents) return;
    // Let Raycast select the newest recent before appending the full catalog.
    const timer = setTimeout(() => setShowCatalogAfterRecents(true), 0);
    return () => clearTimeout(timer);
  }, [isRecentsView, loadingRecents]);

  async function useEmoji(emoji: Emoji, action: "copy" | "paste", content = emoji.emoji) {
    if (usingEmoji.current) return;
    usingEmoji.current = true;
    try {
      try {
        await Clipboard[action](content);
      } catch {
        await showHUD("Could not " + action + " emoji");
        return;
      }
      try {
        // The action promise stays pending until history is persisted.
        setRecentIds(await recentStorage.record(emoji.emoji));
      } catch {
        await showHUD("Emoji " + (action === "copy" ? "copied" : "pasted") + ", but recent history could not be saved");
        return;
      }
      if (action === "copy") await closeMainWindow();
    } finally {
      usingEmoji.current = false;
    }
  }

  function renderEmoji(emoji: Emoji) {
    const paste = (
      <Action title="Paste in Active App" icon={Icon.Clipboard} onAction={() => useEmoji(emoji, "paste")} />
    );
    const copy = (
      <Action
        title="Copy to Clipboard"
        icon={Icon.CopyClipboard}
        shortcut={Keyboard.Shortcut.Common.Copy}
        onAction={() => useEmoji(emoji, "copy")}
      />
    );
    return (
      <List.Item
        key={emoji.emoji}
        id={emoji.emoji}
        icon={emoji.emoji}
        title={emoji.description.replace(/\b(\w)/g, (s) => s.toUpperCase())}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              {primaryAction === "paste" ? (
                <>
                  {paste}
                  {copy}
                </>
              ) : (
                <>
                  {copy}
                  {paste}
                </>
              )}
              {shortCodes && !!emoji.shortCode?.length && (
                <Action
                  title="Copy Shortcode"
                  icon={Icon.CopyClipboard}
                  onAction={() => useEmoji(emoji, "copy", emoji.shortCode![0])}
                />
              )}
              <Action.OpenInBrowser title="View on Emojipedia" url={getEmojipediaLink(emoji.description)} />
            </ActionPanel.Section>
          </ActionPanel>
        }
        accessories={shortCodes && emoji.shortCode?.length ? [{ text: emoji.shortCode.join(" / ") }] : []}
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={(value) => {
        setShowCatalogAfterRecents(false);
        setSearchText(value);
      }}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Category"
          value={category}
          onChange={(value) => {
            setShowCatalogAfterRecents(false);
            setSelectedCategory(value);
          }}
        >
          {(loadingRecents || recentIds.length > 0) && (
            <List.Dropdown.Item title={recentlyUsedCategory} value={recentlyUsedCategory} icon={Icon.Clock} />
          )}
          <List.Dropdown.Item title={allEmojis} value="" icon="🥳" />
          {categories.map(({ category, icon }) => (
            <List.Dropdown.Item key={category} title={category} value={category} icon={icon} />
          ))}
        </List.Dropdown>
      }
    >
      {catalogError && category !== recentlyUsedCategory ? (
        <List.EmptyView
          title="Could Not Load Emojis"
          description="Your recent emojis are still available. Try loading the catalog again."
          actions={
            <ActionPanel>
              <Action title="Retry Loading Emojis" onAction={() => setReload((value) => value + 1)} />
            </ActionPanel>
          }
        />
      ) : (
        <>
          <List.Section title={category || allEmojis}>{filteredEmojis.map(renderEmoji)}</List.Section>
          {showAllBelowRecents && (
            <List.Section title={allEmojis}>
              {allBelowRecents.map(renderEmoji)}
              {catalogError && (
                <List.Item
                  title="Could Not Load Emojis"
                  subtitle="Your recent emojis are still available"
                  actions={
                    <ActionPanel>
                      <Action title="Retry Loading Emojis" onAction={() => setReload((value) => value + 1)} />
                    </ActionPanel>
                  }
                />
              )}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
