import { ActionPanel, Action, List, Icon, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import os from "node:os";
import spotlight from "node-spotlight";
import { Category, SearchResult } from "./types";
import useLocalStorage from "./hooks/useLocalStorage";
import { newTab, newWindow } from "./uri";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [category, setCategory] = useState<Category>(Category.ALL);
  const [results, setResults] = useState<SearchResult[]>([]);
  const {
    data: favorites,
    setData: setFavorites,
    isLoading: isFavoritesLoading,
  } = useLocalStorage<SearchResult[]>("favoriteDirs", []);
  const abortable = useRef<AbortController>();

  const maxResults = 250;

  const { isLoading: isSearchResultsLoading } = usePromise(
    async (query) => {
      if (searchText === "") {
        setResults([]);
        return [];
      }

      const results = await spotlight(query);

      setResults([]);

      let resultsCount = 0;

      for await (const result of results) {
        setResults((state) => [...state, { name: result.path.replace(os.homedir(), "~"), path: result.path }]);

        resultsCount++;

        if (resultsCount >= maxResults) {
          abortable?.current?.abort();
          break;
        }
      }
    },
    [`kind:folders ${searchText}`],
    {
      abortable,
    }
  );

  function onCategoryChange(newValue: Category) {
    setCategory(newValue);
  }

  async function onFavorite(searchResult: SearchResult) {
    if (favorites.find((favorite) => favorite.path === searchResult.path)) {
      setFavorites((state) => state.filter((favorite) => favorite.path !== searchResult.path));
      await showToast(Toast.Style.Success, `Removed from favorites`);
    } else {
      setFavorites((state) => [...state, searchResult]);
      await showToast(Toast.Style.Success, `Added to favorites`);
    }
  }

  async function onRearrange(searchResult: SearchResult, direction: "up" | "down") {
    const favoriteIndex = favorites.findIndex((favorite) => favorite.path === searchResult.path);
    const newFavorites = [...favorites];

    if (direction === "up") {
      newFavorites[favoriteIndex] = newFavorites[favoriteIndex - 1];
      newFavorites[favoriteIndex - 1] = { ...searchResult };
      await showToast(Toast.Style.Success, `Moved up`);
    } else {
      newFavorites[favoriteIndex] = newFavorites[favoriteIndex + 1];
      newFavorites[favoriteIndex + 1] = { ...searchResult };
      await showToast(Toast.Style.Success, `Moved down`);
    }

    setFavorites(newFavorites);
  }

  function getValidRearrangeDirections(searchResult: SearchResult) {
    return {
      up: favorites.findIndex((favorite) => favorite === searchResult) > 0,
      down: favorites.findIndex((favorite) => favorite === searchResult) < favorites.length - 1,
    };
  }

  const filteredResults =
    category === Category.ALL
      ? results.filter((result) => !favorites.find((favorite) => favorite.path === result.path))
      : [];

  const filteredFavorites = searchText
    ? favorites.filter((favorite) => favorite.name.toLowerCase().includes(searchText.toLowerCase()))
    : favorites;

  const isLoading = isSearchResultsLoading || isFavoritesLoading;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Searching directories..."
      searchBarAccessory={<CategoryDropdown onCategoryChange={onCategoryChange} />}
      throttle={true}
      onSearchTextChange={setSearchText}
    >
      {searchText && <List.EmptyView title="No directories found" description="Try refining your search" />}
      {!searchText && (
        <List.EmptyView title="Search for a directory" description="Open a directory on your computer in Warp" />
      )}
      <List.Section title="Favorites">
        {filteredFavorites.map((searchResult) => (
          <SearchListItem
            key={searchResult.path}
            searchResult={searchResult}
            isFavorite={true}
            validRearrangeDirections={getValidRearrangeDirections(searchResult)}
            onFavorite={() => onFavorite(searchResult)}
            onRearrange={onRearrange}
          />
        ))}
      </List.Section>
      <List.Section title="Results">
        {filteredResults.map((searchResult) => (
          <SearchListItem
            key={searchResult.path}
            searchResult={searchResult}
            isFavorite={false}
            onFavorite={() => onFavorite(searchResult)}
          />
        ))}
      </List.Section>
    </List>
  );
}

function CategoryDropdown(props: { onCategoryChange: (newValue: Category) => void }) {
  const { onCategoryChange } = props;

  return (
    <List.Dropdown tooltip="Select Category" storeValue onChange={(newValue) => onCategoryChange(newValue as Category)}>
      <List.Dropdown.Item title={Category.ALL} value={Category.ALL} />
      <List.Dropdown.Item title={Category.FAVORITES} value={Category.FAVORITES} />
    </List.Dropdown>
  );
}

function SearchListItem(props: {
  searchResult: SearchResult;
  isFavorite: boolean;
  validRearrangeDirections?: { up: boolean; down: boolean };
  onFavorite: () => void;
  onRearrange?: (searchResult: SearchResult, direction: "up" | "down") => void;
}) {
  const { searchResult, isFavorite, validRearrangeDirections, onFavorite, onRearrange } = props;

  return (
    <List.Item
      title={searchResult.name}
      key={searchResult.path}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser icon={Icon.Terminal} title="Open in New Warp Tab" url={newTab(searchResult.path)} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Open in New Warp Window"
              url={newWindow(searchResult.path)}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
            <Action.CreateQuicklink
              title="Save as Quicklink: New Tab"
              quicklink={{ link: newTab(searchResult.path) }}
            />
            <Action.CreateQuicklink
              title="Save as Quicklink: New Window"
              quicklink={{ link: newWindow(searchResult.path) }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {!isFavorite ? (
              <Action
                title="Add to Favorites"
                icon={Icon.Star}
                shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                onAction={onFavorite}
              />
            ) : (
              <Action
                title="Remove from Favorites"
                icon={Icon.StarDisabled}
                shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                onAction={onFavorite}
              />
            )}

            {isFavorite && onRearrange && (
              <>
                {validRearrangeDirections?.up && (
                  <Action
                    title="Move Up in Favorites"
                    icon={Icon.ArrowUp}
                    shortcut={{ key: "arrowUp", modifiers: ["cmd", "opt"] }}
                    onAction={() => onRearrange(searchResult, "up")}
                  />
                )}

                {validRearrangeDirections?.down && (
                  <Action
                    title="Move Down in Favorites"
                    icon={Icon.ArrowDown}
                    shortcut={{ key: "arrowDown", modifiers: ["cmd", "opt"] }}
                    onAction={() => onRearrange(searchResult, "down")}
                  />
                )}
              </>
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
