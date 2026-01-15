import {
  Action,
  ActionPanel,
  List,
  showToast,
  Toast,
  Icon,
  Color,
  LocalStorage,
} from "@raycast/api";
import { useEffect, useState, useMemo, useCallback } from "react";
import { fetchSearchIndex, DocItem } from "./api/rustdoc";
import { useCachedPromise } from "@raycast/utils";
import DocDetail from "./components/DocDetail";

// Mapping of types to icons
const TYPE_ICONS: Record<string, Icon> = {
  struct: Icon.Box,
  enum: Icon.Tag,
  fn: Icon.Code,
  trait: Icon.Circle,
  primitive: Icon.Globe,
  macro: Icon.Hashtag,
  module: Icon.Folder,
  const: Icon.Hashtag,
  static: Icon.Hashtag,
  type: Icon.Text,
  keyword: Icon.Key,
  union: Icon.Layers,
  attr: Icon.Paperclip,
  derive: Icon.Pencil,
};

// Colors
const TYPE_COLORS: Record<string, Color> = {
  struct: Color.Blue,
  enum: Color.Orange,
  fn: Color.Green,
  trait: Color.Magenta,
  primitive: Color.Red,
  macro: Color.Purple,
  module: Color.Yellow,
  const: Color.SecondaryText,
  static: Color.SecondaryText,
  type: Color.Blue,
  keyword: Color.Red,
  union: Color.Orange,
  attr: Color.SecondaryText,
  derive: Color.Purple,
};

function getIconForType(type: string): Icon {
  return TYPE_ICONS[type] || Icon.Document;
}

function getColorForType(type: string): Color {
  return TYPE_COLORS[type] || Color.SecondaryText;
}

const FAVORITES_KEY = "rust-docs-favorites";
const HISTORY_KEY = "rust-docs-history";
const MAX_HISTORY = 10;

export default function Command() {
  const { data, isLoading, error } = useCachedPromise(fetchSearchIndex, [], {
    keepPreviousData: true,
    initialData: [],
  });

  const [searchText, setSearchText] = useState("");
  const [favorites, setFavorites] = useState<DocItem[]>([]);
  const [history, setHistory] = useState<DocItem[]>([]);

  // Load favorites and history on mount
  useEffect(() => {
    (async () => {
      const storedFavorites = await LocalStorage.getItem<string>(FAVORITES_KEY);
      if (storedFavorites) {
        setFavorites(JSON.parse(storedFavorites));
      }

      const storedHistory = await LocalStorage.getItem<string>(HISTORY_KEY);
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    })();
  }, []);

  const toggleFavorite = useCallback(
    async (item: DocItem) => {
      let newFavorites;
      const isFavorite = favorites.some((f) => f.url === item.url);

      if (isFavorite) {
        newFavorites = favorites.filter((f) => f.url !== item.url);
        await showToast({
          title: "Removed from Favorites",
          style: Toast.Style.Success,
        });
      } else {
        newFavorites = [item, ...favorites];
        await showToast({
          title: "Added to Favorites",
          style: Toast.Style.Success,
        });
      }

      setFavorites(newFavorites);
      await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
    },
    [favorites],
  );

  const addToHistory = useCallback(
    async (item: DocItem) => {
      const filteredHistory = history.filter((h) => h.url !== item.url);
      const newHistory = [item, ...filteredHistory].slice(0, MAX_HISTORY);
      setHistory(newHistory);
      await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    },
    [history],
  );

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch docs",
        message: String(error),
      });
    }
  }, [error]);

  const filteredItems = useMemo(() => {
    if (!data) return [];
    if (!searchText) return [];

    const lowerSearch = searchText.toLowerCase();

    return data
      .filter((item) => item.path.toLowerCase().includes(lowerSearch))
      .sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const search = lowerSearch;

        if (aName === search && bName !== search) return -1;
        if (bName === search && aName !== search) return 1;

        const aStarts = aName.startsWith(search);
        const bStarts = bName.startsWith(search);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        return 0;
      })
      .slice(0, 100);
  }, [data, searchText]);

  const topLevelModules = useMemo(() => {
    if (!data) return [];
    // Show top-level modules for browsing
    // We filter for modules that don't have nested paths (mostly)
    return data
      .filter(
        (item) =>
          item.type === "module" &&
          !item.path.includes("::", item.path.indexOf("::") + 2),
      )
      .slice(0, 40);
  }, [data]);

  const renderItem = (item: DocItem) => {
    const isFavorite = favorites.some((f) => f.url === item.url);

    return (
      <List.Item
        key={item.url}
        title={item.name}
        subtitle={item.path !== item.name ? item.path : item.type}
        icon={{
          source: getIconForType(item.type),
          tintColor: getColorForType(item.type),
        }}
        accessories={[
          { tag: { value: item.type, color: getColorForType(item.type) } },
          {
            icon: isFavorite
              ? { source: Icon.Star, tintColor: Color.Yellow }
              : undefined,
          },
        ]}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action.Push
                title="Show Details"
                icon={Icon.Sidebar}
                target={<DocDetail item={item} />}
                onPush={() => addToHistory(item)}
              />
              <Action.OpenInBrowser
                url={item.url}
                onOpen={() => addToHistory(item)}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action
                title={
                  isFavorite ? "Remove from Favorites" : "Add to Favorites"
                }
                icon={isFavorite ? Icon.StarDisabled : Icon.Star}
                onAction={() => toggleFavorite(item)}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action.CopyToClipboard content={item.path} title="Copy Path" />
              <Action.CopyToClipboard content={item.url} title="Copy URL" />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Rust Std Lib..."
      throttle
    >
      {searchText === "" ? (
        <>
          {favorites.length > 0 && (
            <List.Section title="Favorites">
              {favorites.map(renderItem)}
            </List.Section>
          )}
          {history.length > 0 && (
            <List.Section title="Recent">
              {history.map(renderItem)}
            </List.Section>
          )}
          {topLevelModules.length > 0 && (
            <List.Section title="Standard Library Modules">
              {topLevelModules.map(renderItem)}
            </List.Section>
          )}
          {favorites.length === 0 &&
            history.length === 0 &&
            topLevelModules.length === 0 &&
            !isLoading && (
              <List.EmptyView
                title="Search for Rust documentation"
                icon={Icon.MagnifyingGlass}
              />
            )}
        </>
      ) : (
        <List.Section title="Results" subtitle={`${filteredItems.length}`}>
          {filteredItems.map(renderItem)}
        </List.Section>
      )}
    </List>
  );
}
