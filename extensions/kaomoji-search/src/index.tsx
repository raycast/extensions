import { ActionPanel, List, Action, getPreferenceValues, Grid, Clipboard, Icon, showHUD } from "@raycast/api";
import { useState, useMemo, useCallback } from "react";
import { lib } from "asciilib";
import { nanoid } from "nanoid";
import { useRecentKaomoji } from "./useRecentKaomoji";
import { SearchResult } from "./types";
import { usePromise } from "@raycast/utils";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const state = useSearch(searchText);
  const { displayMode, primaryAction } = getPreferenceValues<Preferences>();

  const displayGroupedResults = searchText.length === 0;
  const groupedResultsByCategory = useMemo(() => {
    const groupedResults: Record<string, SearchResult[]> = {};
    state.results.forEach((result) => {
      if (!groupedResults[result.category]) {
        groupedResults[result.category] = [];
      }
      groupedResults[result.category].push(result);
    });
    return groupedResults;
  }, [state.results]);

  const groupedResultsCategories = useMemo(() => {
    return Object.keys(groupedResultsByCategory).sort((a, b) => {
      if (a === "UNASSIGNED") {
        return 1;
      }

      if (b === "UNASSIGNED") {
        return -1;
      }

      return a.localeCompare(b);
    });
  }, [groupedResultsByCategory]);

  const { recentKaomojis } = useRecentKaomoji();

  const ListComponent = displayMode === "list" ? List : Grid;
  const ItemComponent = displayMode === "list" ? SearchListItem : SearchGridItem;

  return (
    <ListComponent
      isLoading={state.isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by name..."
      throttle
    >
      {displayGroupedResults ? (
        <>
          <ListComponent.Section title="Frequently Used" subtitle={recentKaomojis.length + ""}>
            {recentKaomojis.map((result) => (
              <ItemComponent key={result.id} searchResult={result} primaryAction={primaryAction} />
            ))}
          </ListComponent.Section>

          {groupedResultsCategories.map((category) => (
            <ListComponent.Section
              title={category}
              subtitle={groupedResultsByCategory[category].length + ""}
              key={category}
            >
              {groupedResultsByCategory[category].map((searchResult) => (
                <ItemComponent key={searchResult.id} searchResult={searchResult} primaryAction={primaryAction} />
              ))}
            </ListComponent.Section>
          ))}
        </>
      ) : (
        <ListComponent.Section title="Results" subtitle={state.results.length + ""}>
          {state.results.map((searchResult) => (
            <ItemComponent key={searchResult.id} searchResult={searchResult} primaryAction={primaryAction} />
          ))}
        </ListComponent.Section>
      )}
    </ListComponent>
  );
}

function ItemActions({
  searchResult,
  primaryAction,
}: {
  searchResult: SearchResult;
  primaryAction: Preferences["primaryAction"];
}) {
  const { addKaomoji } = useRecentKaomoji();

  const pasteInActiveApp = useCallback(() => {
    addKaomoji(searchResult);
    Clipboard.paste(searchResult.name);
  }, [addKaomoji]);

  const copyToClipboard = useCallback(() => {
    addKaomoji(searchResult);
    Clipboard.copy(searchResult.name);
    showHUD("Copied to Clipboard");
  }, [addKaomoji]);

  const PasteInActiveAppAction = useMemo(() => {
    return (
      <Action title="Paste in Active App" onAction={pasteInActiveApp} icon={Icon.Clipboard} key="paste-in-active-app" />
    );
  }, [pasteInActiveApp]);

  const CopyToClipboardAction = useMemo(() => {
    return (
      <Action title="Copy to Clipboard" onAction={copyToClipboard} icon={Icon.Clipboard} key="copy-to-clipboard" />
    );
  }, [copyToClipboard]);

  const actions = useMemo(() => {
    if (primaryAction === "copy-to-clipboard") {
      return [CopyToClipboardAction, PasteInActiveAppAction];
    } else {
      return [PasteInActiveAppAction, CopyToClipboardAction];
    }
  }, [primaryAction, CopyToClipboardAction, PasteInActiveAppAction]);

  return (
    <ActionPanel>
      <ActionPanel.Section>{actions}</ActionPanel.Section>
    </ActionPanel>
  );
}

function SearchListItem({
  searchResult,
  primaryAction,
}: {
  searchResult: SearchResult;
  primaryAction: Preferences["primaryAction"];
}) {
  return (
    <List.Item
      title={searchResult.name}
      accessories={[
        {
          text: searchResult.description,
        },
      ]}
      actions={<ItemActions searchResult={searchResult} primaryAction={primaryAction} />}
    />
  );
}

function toHTMLEntities(str: string) {
  return str.replace(/./gm, function (s) {
    return "&#" + s.charCodeAt(0) + ";";
  });
}

function getSvgWithKaomoji(kaomoji: string, dark = false) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100" >
  <text dominant-baseline="middle" x="45" y="45" text-anchor="middle" fill="${
    dark ? "#fff" : "#000"
  }" font-size="8px" text-length="90" length-adjust="spacing">
    ${toHTMLEntities(kaomoji)}
  </text>
</svg>`;
}

function getBase64SvgUrl(kaomoji: string, dark = false) {
  return "data:image/svg+xml;base64," + Buffer.from(getSvgWithKaomoji(kaomoji, dark)).toString("base64");
}

function SearchGridItem({
  searchResult,
  primaryAction,
}: {
  searchResult: SearchResult;
  primaryAction: Preferences["primaryAction"];
}) {
  return (
    <Grid.Item
      content={{
        source: {
          dark: getBase64SvgUrl(searchResult.name, true),
          light: getBase64SvgUrl(searchResult.name, false),
        },
      }}
      title={searchResult.description}
      actions={<ItemActions searchResult={searchResult} primaryAction={primaryAction} />}
    />
  );
}

function useSearch(searchText: string) {
  const { isLoading, data = [] } = usePromise(async (search) => await performSearch(search), [searchText], {
    failureToastOptions: {
      title: "Could not perform search",
    },
  });

  return {
    isLoading,
    results: data,
  };
}

async function performSearch(searchText: string): Promise<SearchResult[]> {
  const results = await searchForResults(searchText);

  return results.map((entry: AsciiLibEntry) => {
    return {
      id: nanoid(),
      name: entry.entry,
      description: entry.name,
      category: entry.category,
    };
  });
}

interface AsciiLibEntry {
  name: string;
  entry: string;
  keywords: string[];
  category: string;
}

function searchForResults(keyword: string): Promise<AsciiLibEntry[]> {
  const lowercaseKeyword = keyword.toLowerCase();
  const database = Object.entries(lib).map((e) => e[1]) as AsciiLibEntry[];

  const filteredResults = database.filter((entry: AsciiLibEntry) => {
    return (
      entry.name.toLowerCase().includes(lowercaseKeyword) ||
      entry.keywords.some((keyword) => keyword.toLowerCase().includes(lowercaseKeyword)) ||
      entry.category.toLowerCase().includes(lowercaseKeyword)
    );
  });

  return Promise.resolve(filteredResults);
}
