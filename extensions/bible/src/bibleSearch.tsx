import * as React from "react";
import { Action, ActionPanel, getPreferenceValues, List, Icon, showToast, Toast } from "@raycast/api";
import { ReferenceSearchResult, search } from "./bibleGatewayApi";
import { versions as bibleVersions } from "../assets/bible-versions.json";

const DEFAULT_BIBLE_VERSION_ABBR = "NLT";
const SEARCH_DELAY_MS = 450;

type Preferences = { enterToSearch: boolean; oneVersePerLine: boolean; includeVerseNumbers: boolean };
const prefs = getPreferenceValues<Preferences>();

export default function Command() {
  const [query, setQuery] = React.useState({ search: "", version: DEFAULT_BIBLE_VERSION_ABBR });
  const debounceSearchTimeout = React.useRef<NodeJS.Timeout | null>(null);

  const [isLoading, setIsLoading] = React.useState(false);
  const [searchResult, setSearchResult] = React.useState<ReferenceSearchResult | undefined>(undefined);

  const performSearch = React.useCallback(async () => {
    if (query.search === "") {
      setSearchResult(undefined);
      return;
    }

    setIsLoading(true);
    try {
      const result = await search(query.search, query.version, { includeVerseNumbers: prefs.includeVerseNumbers });
      setSearchResult(result);
    } catch (error) {
      if (error instanceof Error) {
        showToast({ title: "Error", message: error.message, style: Toast.Style.Failure });
      }
    } finally {
      setIsLoading(false);
    }
  }, [query.search, query.version]);

  React.useEffect(() => {
    // Don't search when query changes if the user only wants to search when they press enter.
    if (!prefs.enterToSearch) {
      performSearch();
    }
  }, [performSearch]);

  const detailContent = React.useMemo(() => {
    if (!searchResult?.passages.length) return null;
    return { markdown: createMarkdown(searchResult), clipboardText: createClipboardText(searchResult) };
  }, [searchResult]);

  function getEmptyViewText() {
    if (isLoading) {
      return "Searching...";
    } else if (prefs.enterToSearch && searchResult === undefined) {
      return "Press Enter to Search";
    } else if (query.search === "") {
      return "Start Typing to Search";
    } else {
      return "No Results";
    }
  }

  const searchAction = <Action title="Search" icon={Icon.Binoculars} onAction={performSearch} />;
  return (
    <List
      isLoading={isLoading}
      isShowingDetail={searchResult && searchResult.passages.length > 0}
      searchText={query.search}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Bible Version"
          onChange={(version) => setQuery((old) => ({ ...old, version }))}
          storeValue
          defaultValue={query.version}
        >
          {bibleVersions.map((v) => (
            <List.Dropdown.Item title={v[0]} value={v[1]} key={v[1]} />
          ))}
        </List.Dropdown>
      }
      onSearchTextChange={(newQuery) => {
        if (prefs.enterToSearch) {
          setQuery((old) => ({ ...old, search: newQuery.trim() }));
        } else {
          // debounce updating query text. `throttle` prop is too short
          if (debounceSearchTimeout.current) clearTimeout(debounceSearchTimeout.current);
          debounceSearchTimeout.current = setTimeout(
            () => setQuery((old) => ({ ...old, search: newQuery.trim() })),
            SEARCH_DELAY_MS
          );
        }
      }}
    >
      {searchResult && searchResult.passages.length > 0 && detailContent ? (
        <List.Item
          title={createReferenceList(searchResult)}
          detail={<List.Item.Detail markdown={detailContent.markdown} />}
          actions={
            <ActionPanel>
              {prefs.enterToSearch && searchAction}
              <Action.CopyToClipboard content={detailContent.clipboardText} />
              <Action.Paste
                content={detailContent.clipboardText}
                shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
              />
              <Action.OpenInBrowser
                title="Open at BibleGateway.com"
                url={searchResult.url}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          title={getEmptyViewText()}
          icon="../assets/extension-icon-64.png"
          actions={<ActionPanel>{prefs.enterToSearch && searchAction}</ActionPanel>}
        />
      )}
    </List>
  );
}

function createMarkdown(searchResult: ReferenceSearchResult) {
  return (
    searchResult.passages
      .map((p) => {
        const passageText = p.verses.join(prefs.oneVersePerLine ? "  \n" : " ");
        const versionAbbr = getContentsOfLastParenthesis(searchResult.version);
        return `${passageText}  \n${p.reference} (${versionAbbr})`;
      })
      .join("\n\n") + `\n\n---\n\n*${searchResult.copyright}*`
  );
}

function createClipboardText(searchResult: ReferenceSearchResult) {
  return (
    searchResult.passages
      .map((p) => {
        const passageText = p.verses.join(prefs.oneVersePerLine ? "\n" : " ");
        const versionAbbr = getContentsOfLastParenthesis(searchResult.version);
        return `${passageText}\n${p.reference} (${versionAbbr})`;
      })
      .join("\n\n") + `\n\n${searchResult.copyright}`
  );
}

function createReferenceList(searchResult: ReferenceSearchResult) {
  const refList = searchResult.passages.map((p) => p.reference).join("; ");
  const versionAbbr = getContentsOfLastParenthesis(searchResult.version);
  return `${refList} (${versionAbbr})`;
}

/**
 * Returns the string between the last pair of parentheses in a string.
 * Used to get the bible version abbreviation in a string like "New American Bible (Revised Edition) (NABRE)".
 * In that case the function would return "NABRE".
 *
 * Returns the original string if no parentheses are found.
 */
function getContentsOfLastParenthesis(version: string): string {
  const lastOpenParenIndex = version.lastIndexOf("(");
  const lastCloseParenIndex = version.lastIndexOf(")");
  if (lastOpenParenIndex === -1 || lastCloseParenIndex === -1) {
    return version; // no parentheses found, return the whole string
  }
  return version.slice(lastOpenParenIndex + 1, lastCloseParenIndex);
}
