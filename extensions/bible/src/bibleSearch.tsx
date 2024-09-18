import {
  Action,
  ActionPanel,
  getPreferenceValues,
  getSelectedText,
  Icon,
  LaunchProps,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import * as React from "react";
import { versions as bibleVersions } from "../assets/bible-versions.json";
import { ReferenceSearchResult, search } from "./bibleGatewayApi";

type Preferences = Preferences.BibleSearch;

export default function Command(props: LaunchProps<{ arguments: Arguments.BibleSearch }>) {
  const prefs = getPreferenceValues<Preferences>();
  const { ref = "", version = prefs.defaultBibleVersion } = props.arguments;
  const [query, setQuery] = React.useState({ search: ref, version: version.trim().toUpperCase() });
  const [isLoading, setIsLoading] = React.useState(false);
  const [searchResult, setSearchResult] = React.useState<ReferenceSearchResult | undefined>(undefined);

  React.useEffect(() => {
    async function setSelectedTextAsQuery() {
      try {
        const selectedText = await getSelectedText();
        if (selectedText) {
          const { ref, version } = parseReference(selectedText);
          setQuery((old) => ({ ...old, search: ref, version: version || old.version }));
        }
      } catch (error) {
        /* empty */
      }
    }

    const isArgsEmpty =
      Object.keys(props.arguments).length === 0 || (props.arguments.ref === "" && props.arguments.version === "");
    if (isArgsEmpty) {
      setSelectedTextAsQuery();
    }
  }, []);

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
  }, [prefs.includeVerseNumbers, query.search, query.version]);

  React.useEffect(() => {
    // Don't search when query changes if the user only wants to search when they press enter.
    if (!prefs.enterToSearch) {
      performSearch();
    }
  }, [performSearch, prefs.enterToSearch]);

  const detailContent = React.useMemo(() => {
    if (!searchResult?.passages.length) return null;
    return { markdown: createMarkdown(prefs, searchResult), clipboardText: createClipboardText(prefs, searchResult) };
  }, [prefs, searchResult]);

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
      throttle={true}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Bible Version"
          onChange={(version) => setQuery((old) => ({ ...old, version }))}
          value={query.version || undefined}
          defaultValue={prefs.defaultBibleVersion}
        >
          {bibleVersions.map(([name, abbreviation]) => (
            <List.Dropdown.Item title={name} value={abbreviation} key={abbreviation} />
          ))}
        </List.Dropdown>
      }
      onSearchTextChange={(newQuery) => setQuery((old) => ({ ...old, search: newQuery }))}
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

function createMarkdown(prefs: Preferences, searchResult: ReferenceSearchResult) {
  const copyright = prefs.includeCopyright ? `\n\n---\n\n*${searchResult.copyright}*` : "";

  return (
    searchResult.passages
      .map((p) => {
        const passageText = p.verses.join(prefs.oneVersePerLine ? "  \n" : " ");
        const versionAbbr = getContentsOfLastParenthesis(searchResult.version);
        const reference = prefs.includeReferences ? `  \n${p.reference} (${versionAbbr})` : "";

        return passageText + reference;
      })
      .join("\n\n") + copyright
  );
}

function createClipboardText(prefs: Preferences, searchResult: ReferenceSearchResult) {
  const copyright = prefs.includeCopyright ? `\n\n${searchResult.copyright}` : "";

  return (
    searchResult.passages
      .map((p) => {
        const passageText = p.verses.join(prefs.oneVersePerLine ? "\n" : " ");
        const versionAbbr = getContentsOfLastParenthesis(searchResult.version);
        const reference = prefs.includeReferences ? `\n${p.reference} (${versionAbbr})` : "";

        return passageText + reference;
      })
      .join("\n\n") + copyright
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

/**
 * Simple parser for bible references.
 *
 * Parses "John 3:16 NIV" into { ref: "John 3:16", version: "NIV" }
 * Parses "John3:16 (NIV)" into { ref: "John 3:16", version: "NIV" }
 * Parses "John 3:16" into { ref: "John 3:16", version: undefined }
 * Parses "John3:16 (ZZZZ)" into { ref: "John 3:16 (ZZZZ)", version: undefined }
 */
function parseReference(reference: string): { ref: string; version: string | undefined } {
  const trimmedReference = reference.trim();
  const lastWord = trimmedReference.split(" ").pop();
  const version = lastWord ? parseVersionAbbreviation(lastWord, bibleVersions) : undefined;
  const refWithoutVersion = lastWord && version ? trimmedReference.slice(0, -lastWord.length).trim() : trimmedReference;
  return { ref: refWithoutVersion, version };
}

function parseVersionAbbreviation(maybeVersionAbbrev: string, validVersions: typeof bibleVersions): string | undefined {
  maybeVersionAbbrev = maybeVersionAbbrev
    .replace(/[()[\]]/gi, "") // remove brackets and parentheses
    .toUpperCase();
  const isVersion = validVersions.some(([, abbreviation]) => abbreviation === maybeVersionAbbrev);
  return isVersion ? maybeVersionAbbrev : undefined;
}
