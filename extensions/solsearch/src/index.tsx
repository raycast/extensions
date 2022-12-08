import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { ReactElement, ReactNode, useEffect, useState } from "react";
import { getClipboardValue } from "./clipboard";
import { resolveUrl } from "./explorerResolver";
import { parseInput, SolType } from "./inputParser";
import { getPreviousSearches, putIfNotUnknown, StorageItem } from "./storage";

export default function CommandWithCustomEmptyView() {
  interface SearchValues {
    searchText: string;
    clipboard: string;
    items: StorageItem[];
  }

  const [searchState, setSearchState] = useState<SearchValues>({
    searchText: "",
    clipboard: "",
    items: [],
  });

  useEffect(() => {
    const loadPrevious = async () => {
      const clipboard = await getClipboardValue();
      const previousSearches = await getPreviousSearches();
      setSearchState((prevState) => ({ ...prevState, items: previousSearches, clipboard: clipboard }));
    };
    loadPrevious().catch(console.log);
  }, []);

  async function onChangeText(text: string) {
    const solType = parseInput(text);
    if (solType === SolType.UNKNOWN) {
      const clipboard = await getClipboardValue();
      setSearchState((previous) => ({ ...previous, searchText: text, clipboard: clipboard }));
    } else {
      setSearchState((previous) => ({ ...previous, searchText: text }));
    }
  }

  return (
    <List onSearchTextChange={(newValue) => onChangeText(newValue)}>
      {handleTextSearchChange(searchState.searchText, searchState.items, searchState.clipboard)}
    </List>
  );
}

/**
 * Constructs list items from search, clipboard value, and previous searches
 * @param search current search (used either as filter for previous items or input to search by)
 * @param clipboardValue value from clipboard
 * @param previousItems previous searched items (only resolved transactions, addresses, or blocks)
 */
function handleTextSearchChange(search: string, previousItems: StorageItem[], clipboardValue: string): ReactNode {
  const firstItem = handleFirstItem(search, clipboardValue);

  const restItems = previousItems
    .filter((item) => item.data !== firstItem.key && item.data.toLowerCase().includes(search.toLowerCase()))
    .map((item) => createPreviousSearchListItem(item));

  return [firstItem, ...restItems];
}

/**
 * Constructs first list item.
 * It can be:
 * - Empty - if both search and clipboard are empty or not contains transaction, address, or block
 * - Open browser action with search - in case of search is transaction, address, or block
 * - Open browser action with clipboard value - if search is empty or filter, and clipboard value is transaction, address, or block
 * @param search value from search input
 * @param clipboardValue value from clipboard
 */
function handleFirstItem(search: string, clipboardValue: string): ReactElement {
  const searchSolType = parseInput(search);
  if (searchSolType !== SolType.UNKNOWN) {
    return (
      <List.Item
        key={search}
        title={`Open  ${searchSolType}`}
        subtitle={shorterData(search)}
        actions={createOpenInBrowserAction(search)}
      />
    );
  }

  const clipboardSolType = parseInput(clipboardValue);
  if (clipboardSolType !== SolType.UNKNOWN) {
    return (
      <List.Item
        key={clipboardValue}
        title={clipboardSolType}
        subtitle={shorterData(clipboardValue)}
        accessories={[{ icon: Icon.Clipboard, text: "From clipboard" }]}
        actions={createOpenInBrowserAction(clipboardValue)}
      />
    );
  }

  return <List.EmptyView key={"Empty"} title="Type transaction, address, or block from Solana" />;
}

/**
 * Constructs list item using StorageItem object
 * @param item value from LocalStorage
 */
function createPreviousSearchListItem(item: StorageItem): ReactNode {
  return (
    <List.Item
      key={item.data}
      title={parseInput(item.data)}
      subtitle={shorterData(item.data)}
      accessories={[{ icon: Icon.Clock, date: new Date(item.lastUsed) }]}
      actions={createOpenInBrowserAction(item.data)}
    />
  );
}

/**
 * Constructs action item with correct URL to preferred explorer
 * @param input transaction, address, or block
 */
function createOpenInBrowserAction(input: string): ReactNode {
  return (
    <ActionPanel>
      <Action.OpenInBrowser url={`${resolveUrl(input)}`} onOpen={() => putIfNotUnknown(input)} />
    </ActionPanel>
  );
}

/**
 * Cut too long data (only transaction hashes for current version)
 * @param input transaction, address, or block
 */
function shorterData(input: string): string {
  if (input.length < 45) {
    return input;
  }

  return input.slice(0, 20) + "***" + input.slice(-20);
}
