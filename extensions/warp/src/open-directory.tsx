import { useMemo, useRef, useState } from "react";
import { ActionPanel, Action, List, Icon, showToast, Toast, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { Category, SearchResult } from "./types";
import useLocalStorage from "./hooks/useLocalStorage";
import { getNewTabUri, getNewWindowUri } from "./uri";
import { getAppName } from "./constants";
import { getEffectiveRoots, searchDirectoriesMac, searchDirectoriesWindows } from "./search-directories";
import { AddRootForm, ManageRoots } from "./manage-roots";

const isWindows = process.platform === "win32";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [category, setCategory] = useState<Category>(Category.ALL);
  const [results, setResults] = useState<SearchResult[]>([]);
  const { data: pins, setData: setPins, isLoading: isPinsLoading } = useLocalStorage<SearchResult[]>("pinnedDirs", []);
  const { data: roots, setData: setRoots, isLoading: isRootsLoading } = useLocalStorage<string[]>("searchRoots", []);
  const abortable = useRef<AbortController>();

  const maxResults = 250;

  const effectiveRoots = useMemo(() => getEffectiveRoots(roots), [roots]);

  const { isLoading: isSearchResultsLoading } = usePromise(
    async (query: string, searchRoots: string[]) => {
      if (query === "") {
        setResults([]);
        return;
      }

      // Capture this search's signal so a newer search replacing
      // `abortable.current` can't trick us into committing stale results.
      const signal = abortable.current?.signal;

      const found = isWindows
        ? await searchDirectoriesWindows(query, searchRoots, maxResults, signal)
        : await searchDirectoriesMac(query, searchRoots, maxResults, signal);

      if (signal?.aborted) return;

      setResults(found);
    },
    [searchText, effectiveRoots],
    {
      // Wait until persisted roots have loaded so the first search isn't scoped
      // to the home-folder fallback before the user's folders are available.
      execute: !isRootsLoading,
      abortable,
    }
  );

  function onCategoryChange(newValue: Category) {
    setCategory(newValue);
  }

  function addRoots(paths: string[]) {
    setRoots((state) => {
      const next = [...state];
      for (const path of paths) {
        if (!next.includes(path)) next.push(path);
      }
      return next;
    });
  }

  function removeRoot(path: string) {
    setRoots((state) => state.filter((root) => root !== path));
  }

  async function onPin(searchResult: SearchResult) {
    if (pins.find((pinned) => pinned.path === searchResult.path)) {
      setPins((state) => state.filter((pinned) => pinned.path !== searchResult.path));
      await showToast(Toast.Style.Success, `Unpinned`);
    } else {
      setPins((state) => [...state, searchResult]);
      await showToast(Toast.Style.Success, `Pinned`);
    }
  }

  async function onRearrange(searchResult: SearchResult, direction: "up" | "down") {
    const pinnedIndex = pins.findIndex((pinned) => pinned.path === searchResult.path);
    const newPins = [...pins];

    if (direction === "up") {
      newPins[pinnedIndex] = newPins[pinnedIndex - 1];
      newPins[pinnedIndex - 1] = { ...searchResult };
      await showToast(Toast.Style.Success, `Moved up`);
    } else {
      newPins[pinnedIndex] = newPins[pinnedIndex + 1];
      newPins[pinnedIndex + 1] = { ...searchResult };
      await showToast(Toast.Style.Success, `Moved down`);
    }

    setPins(newPins);
  }

  function getValidRearrangeDirections(searchResult: SearchResult) {
    return {
      up: pins.findIndex((pinned) => pinned === searchResult) > 0,
      down: pins.findIndex((pinned) => pinned === searchResult) < pins.length - 1,
    };
  }

  const rootActions = <RootFolderActions roots={roots} onAddRoots={addRoots} onRemoveRoot={removeRoot} />;

  const filteredResults =
    category === Category.ALL ? results.filter((result) => !pins.find((pinned) => pinned.path === result.path)) : [];

  const filteredPins = searchText
    ? pins.filter((pinned) => pinned.name.toLowerCase().includes(searchText.toLowerCase()))
    : pins;

  const isLoading = isSearchResultsLoading || isPinsLoading || isRootsLoading;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Searching directories..."
      searchBarAccessory={<CategoryDropdown onCategoryChange={onCategoryChange} />}
      throttle={true}
      onSearchTextChange={setSearchText}
    >
      {searchText && (
        <List.EmptyView
          title="No directories found"
          description="Try refining your search or adding a search folder"
          actions={<ActionPanel>{rootActions}</ActionPanel>}
        />
      )}
      {!searchText && (
        <List.EmptyView
          title="Search for a directory"
          description={`Open a directory on your computer in ${getAppName()}`}
          actions={<ActionPanel>{rootActions}</ActionPanel>}
        />
      )}
      <List.Section title={Category.PINNED}>
        {filteredPins.map((searchResult) => (
          <SearchListItem
            key={searchResult.path}
            searchResult={searchResult}
            isPinned={true}
            validRearrangeDirections={getValidRearrangeDirections(searchResult)}
            onPin={() => onPin(searchResult)}
            onRearrange={onRearrange}
            extraActions={rootActions}
          />
        ))}
      </List.Section>
      <List.Section title="Results">
        {filteredResults.map((searchResult) => (
          <SearchListItem
            key={searchResult.path}
            searchResult={searchResult}
            isPinned={false}
            onPin={() => onPin(searchResult)}
            extraActions={rootActions}
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
      <List.Dropdown.Item title={Category.PINNED} value={Category.PINNED} />
    </List.Dropdown>
  );
}

function RootFolderActions(props: {
  roots: string[];
  onAddRoots: (paths: string[]) => void;
  onRemoveRoot: (path: string) => void;
}) {
  return (
    <ActionPanel.Section title="Search Folders">
      <Action.Push
        title="Add Search Folder"
        icon={Icon.NewFolder}
        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
        target={<AddRootForm onAdd={props.onAddRoots} />}
      />
      <Action.Push
        title="Manage Search Folders"
        icon={Icon.Folder}
        shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
        target={<ManageRoots roots={props.roots} onAdd={props.onAddRoots} onRemove={props.onRemoveRoot} />}
      />
    </ActionPanel.Section>
  );
}

function SearchListItem(props: {
  searchResult: SearchResult;
  isPinned: boolean;
  validRearrangeDirections?: { up: boolean; down: boolean };
  onPin: () => void;
  onRearrange?: (searchResult: SearchResult, direction: "up" | "down") => void;
  extraActions?: JSX.Element;
}) {
  const { searchResult, isPinned, validRearrangeDirections, onPin, onRearrange, extraActions } = props;

  return (
    <List.Item
      title={searchResult.name}
      key={searchResult.path}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              icon={Icon.Terminal}
              title={`Open in New ${getAppName()} Tab`}
              url={getNewTabUri(searchResult.path)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title={`Open in New ${getAppName()} Window`}
              url={getNewWindowUri(searchResult.path)}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
            <Action.CreateQuicklink
              title={`Save as Quicklink: New ${getAppName()} Tab`}
              quicklink={{ link: getNewTabUri(searchResult.path) }}
            />
            <Action.CreateQuicklink
              title={`Save as Quicklink: New ${getAppName()} Window`}
              quicklink={{ link: getNewWindowUri(searchResult.path) }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {!isPinned ? (
              <Action title="Pin Directory" icon={Icon.Pin} shortcut={Keyboard.Shortcut.Common.Pin} onAction={onPin} />
            ) : (
              <Action
                title="Unpin Directory"
                icon={Icon.PinDisabled}
                shortcut={Keyboard.Shortcut.Common.Pin}
                onAction={onPin}
              />
            )}

            {isPinned && onRearrange && (
              <>
                {validRearrangeDirections?.up && (
                  <Action
                    title="Move Up in Pinned"
                    icon={Icon.ArrowUp}
                    shortcut={Keyboard.Shortcut.Common.MoveUp}
                    onAction={() => onRearrange(searchResult, "up")}
                  />
                )}

                {validRearrangeDirections?.down && (
                  <Action
                    title="Move Down in Pinned"
                    icon={Icon.ArrowDown}
                    shortcut={Keyboard.Shortcut.Common.MoveDown}
                    onAction={() => onRearrange(searchResult, "down")}
                  />
                )}
              </>
            )}
          </ActionPanel.Section>
          {extraActions}
        </ActionPanel>
      }
    />
  );
}
