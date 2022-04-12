import * as React from "react";
import { Action, ActionPanel, getPreferenceValues, List, showToast, Toast } from "@raycast/api";
import { ReferenceSearchResult, search } from "./bibleGatewayApi";
import axios from "axios";
import { versions as bibleVersions } from "../assets/bible-versions.json";

type Preferences = { enterToSearch: boolean; oneVersePerLine: boolean; includeVerseNumbers: boolean };
const prefs = getPreferenceValues<Preferences>();

export default function Command() {
  const [query, setQuery] = React.useState({ search: "", version: "NLT" });
  const debounceSearchTimeout = React.useRef<NodeJS.Timeout | null>(null);

  const [isLoadingPassages, setIsLoadingPassages] = React.useState(false);
  const [searchResult, setSearchResult] = React.useState<ReferenceSearchResult | undefined>(undefined);

  const performSearch = React.useCallback(() => {
    setIsLoadingPassages(true);
    search(query.search, query.version, { includeVerseNumbers: prefs.includeVerseNumbers })
      .then((result) => setSearchResult(result))
      .catch((error) => {
        if (error instanceof axios.Cancel) return; // ignore cancelled requests
        if (error instanceof Error) {
          showToast({ title: "Error", message: error.message, style: Toast.Style.Failure });
        }
      })
      .finally(() => setIsLoadingPassages(false));
  }, [query.search, query.version]);

  React.useEffect(() => {
    // Don't search when query changes if the user only wants to search when they press enter.
    // Also don't search if the query is too short.
    if (prefs.enterToSearch || query.search.length <= 2) {
      return;
    }
    performSearch();
  }, [performSearch, query.search.length]);

  const detailContent = React.useMemo(() => {
    if (!searchResult || searchResult.passages.length === 0) return null;
    return { markdown: createMarkdown(searchResult), clipboardText: createClipboardText(searchResult) };
  }, [searchResult]);

  return (
    <List
      isLoading={isLoadingPassages}
      isShowingDetail={searchResult && searchResult.passages.length > 0}
      searchText={query.search}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Bible Version"
          onChange={(version) => setQuery(({ search }) => ({ search, version }))}
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
          setQuery(({ version }) => ({ search: newQuery.trim(), version }));
        } else {
          // debounce updating query text. `throttle` prop is too short
          if (debounceSearchTimeout.current) clearTimeout(debounceSearchTimeout.current);
          debounceSearchTimeout.current = setTimeout(
            () => setQuery(({ version }) => ({ search: newQuery.trim(), version })),
            450
          );
        }
      }}
      actions={
        prefs.enterToSearch ? (
          <ActionPanel>{<Action title="Search" onAction={performSearch} />}</ActionPanel>
        ) : undefined
      }
    >
      {searchResult && detailContent ? (
        <List.Item
          title={createReferenceList(searchResult)}
          detail={<List.Item.Detail markdown={detailContent.markdown} />}
          actions={
            <ActionPanel>
              {prefs.enterToSearch && <Action title="Search" onAction={performSearch} />}
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
      ) : null}
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
      .join("\n\n") + `\n\n*${searchResult.copyright}*`
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
