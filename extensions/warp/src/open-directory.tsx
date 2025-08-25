import { useRef, useState } from "react";
import { ActionPanel, Action, List, Icon, showToast, Toast, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { Category, SearchResult } from "./types";
import useLocalStorage from "./hooks/useLocalStorage";
import { getNewTabUri, getNewWindowUri } from "./uri";
import { getAppName } from "./constants";
import { searchDirectories } from "./utils/directorySearch";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [category, setCategory] = useState<Category>(Category.ALL);
  const [results, setResults] = useState<SearchResult[]>([]);
  const { data: pins, setData: setPins, isLoading: isPinsLoading } = useLocalStorage<SearchResult[]>("pinnedDirs", []);
  const abortable = useRef<AbortController>(new AbortController());

  const maxResults = 250;

  const { isLoading: isSearchResultsLoading } = usePromise(
    async (query: string) => {
      if (!query || query.trim() === "") {
        setResults([]);
        return [];
      }

      // Reset previous search
      setResults([]);
      let resultsCount = 0;
      const batchSize = 10; // Add results in batches for better UX
      let batch: SearchResult[] = [];
      const seenPaths = new Set<string>(); // Track seen paths to avoid duplicates

      try {
        // Use our improved priority-based search function
        for await (const result of searchDirectories(query.trim(), maxResults)) {
          // Skip if we've already seen this path
          if (seenPaths.has(result.path)) {
            continue;
          }

          seenPaths.add(result.path);
          batch.push(result);
          resultsCount++;

          // Update UI in batches for better performance
          if (batch.length >= batchSize || resultsCount >= maxResults) {
            setResults((state) => [...state, ...batch]);
            batch = [];
          }

          if (resultsCount >= maxResults) {
            break;
          }
        }

        // Add any remaining results in the batch
        if (batch.length > 0) {
          setResults((state) => [...state, ...batch]);
        }
      } catch (error) {
        // Handle any errors gracefully
        console.warn("Search error:", error);
      }

      return [];
    },
    [searchText],
    {
      abortable,
    },
  );

  function onCategoryChange(newValue: Category) {
    setCategory(newValue);
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

  const filteredResults =
    category === Category.ALL ? results.filter((result) => !pins.some((pinned) => pinned.path === result.path)) : [];

  const filteredPins = searchText
    ? pins.filter((pinned) => pinned.name.toLowerCase().includes(searchText.toLowerCase()))
    : pins;

  const isLoading = isSearchResultsLoading || isPinsLoading;

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
        <List.EmptyView
          title="Search for a directory"
          description={`Open a directory on your computer in ${getAppName()}`}
        />
      )}
      <List.Section title={Category.PINNED}>
        {filteredPins.map((searchResult, index) => (
          <SearchListItem
            key={`pinned-${searchResult.path}-${index}`}
            searchResult={searchResult}
            isPinned={true}
            validRearrangeDirections={getValidRearrangeDirections(searchResult)}
            onPin={() => onPin(searchResult)}
            onRearrange={onRearrange}
          />
        ))}
      </List.Section>
      <List.Section title="Results">
        {filteredResults.map((searchResult, index) => (
          <SearchListItem
            key={`result-${searchResult.path}-${index}`}
            searchResult={searchResult}
            isPinned={false}
            onPin={() => onPin(searchResult)}
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

function SearchListItem(props: {
  searchResult: SearchResult;
  isPinned: boolean;
  validRearrangeDirections?: { up: boolean; down: boolean };
  onPin: () => void;
  onRearrange?: (searchResult: SearchResult, direction: "up" | "down") => void;
}) {
  const { searchResult, isPinned, validRearrangeDirections, onPin, onRearrange } = props;

  return (
    <List.Item
      title={searchResult.name}
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
                    title="Move up in Pinned"
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
        </ActionPanel>
      }
    />
  );
}
