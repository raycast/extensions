import {
  Action,
  ActionPanel,
  getPreferenceValues,
  getSelectedText,
  Keyboard,
  LaunchProps,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import * as React from "react";
import { versions as bibleVersions } from "../assets/bible-versions.json";
import { ReferenceSearchResult, search } from "./bibleGatewayApi";

type Preferences = Preferences.BibleSearch;
type FormattingOptions = Pick<
  Preferences,
  "includeVerseNumbers" | "includeReferences" | "includeCopyright" | "oneVersePerLine"
>;

export default function Command(props: LaunchProps<{ arguments: Arguments.BibleSearch }>) {
  const { defaultBibleVersion, includeCopyright, includeVerseNumbers, includeReferences, oneVersePerLine } =
    getPreferenceValues<Preferences>();
  const { ref, version = defaultBibleVersion } = props.arguments;
  const [query, setQuery] = React.useState({ search: ref, version: version.trim().toUpperCase() });
  const { data: searchResult, isLoading, error } = useBibleSearch(query);

  React.useEffect(() => {
    async function setSelectedTextAsQuery() {
      try {
        const selectedText = await getSelectedText();
        if (selectedText.trim()) {
          const { ref, version } = parseReference(selectedText);
          setQuery((old) => ({ search: ref, version: version || old.version }));
        }
      } catch {
        /* empty */
      }
    }

    if (props.arguments.ref === "" && props.arguments.version === "") {
      setSelectedTextAsQuery();
    }
  }, []);

  React.useEffect(() => {
    if (error) {
      showToast({ title: "Error", message: error.message, style: Toast.Style.Failure });
    }
  }, [error]);

  const detailContent = React.useMemo(() => {
    if (!searchResult?.passages.length) return null;
    const formattingOptions: FormattingOptions = {
      includeCopyright,
      includeVerseNumbers,
      includeReferences,
      oneVersePerLine,
    };
    return {
      markdown: createMarkdown(formattingOptions, searchResult),
      clipboardText: createClipboardText(formattingOptions, searchResult),
    };
  }, [includeCopyright, includeVerseNumbers, includeReferences, oneVersePerLine, searchResult]);

  function getEmptyViewText() {
    if (isLoading) {
      return "Searching...";
    } else if (query.search === "") {
      return "Start Typing to Search";
    } else {
      return "No Results";
    }
  }

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
          defaultValue={defaultBibleVersion}
        >
          {bibleVersions.map(([name, abbreviation]) => (
            <List.Dropdown.Item title={name} value={abbreviation} key={abbreviation} />
          ))}
        </List.Dropdown>
      }
      onSearchTextChange={(search) => setQuery((old) => ({ ...old, search }))}
    >
      {searchResult && searchResult.passages.length > 0 && detailContent ? (
        <List.Item
          title={createReferenceList(searchResult)}
          detail={<List.Item.Detail markdown={detailContent.markdown} />}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={detailContent.clipboardText} />
              <Action.Paste
                content={detailContent.clipboardText}
                shortcut={{
                  macOS: { modifiers: ["cmd", "shift"], key: "enter" },
                  windows: { modifiers: ["ctrl", "shift"], key: "enter" },
                }}
              />
              <Action.OpenInBrowser
                title="Open at BibleGateway.com"
                url={searchResult.url}
                shortcut={Keyboard.Shortcut.Common.Open}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView title={getEmptyViewText()} icon="../assets/extension-icon-64.png" />
      )}
    </List>
  );
}

function useBibleSearch(query: { search: string; version: string }) {
  const [data, setData] = React.useState<ReferenceSearchResult | undefined>(undefined);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<Error | null>(null);
  React.useEffect(() => {
    if (!query.search) {
      setData(undefined);
      setError(null);
      setIsLoading(false);
      return;
    }

    let ignore = false;
    setIsLoading(true);
    search(query.search, query.version)
      .then((result) => {
        if (!ignore) {
          setData(result);
          setError(null);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setData(undefined);
          setError(err);
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [query.search, query.version]);
  return { data, error, isLoading };
}

function createMarkdown(prefs: FormattingOptions, searchResult: ReferenceSearchResult) {
  const { includeCopyright, includeReferences, includeVerseNumbers, oneVersePerLine } = prefs;

  const formattedPassages = searchResult.passages
    .map((passage) => {
      const verses = passage.verses
        .map((v) => (includeVerseNumbers ? `[${v.verse}] ${v.text}` : v.text))
        .join(oneVersePerLine ? "  \n" : " ");
      if (includeReferences) {
        const reference = `${passage.reference} (${getContentsOfLastParenthesis(searchResult.version)})`;
        return `${verses}  \n${reference}`;
      }
      return verses;
    })
    .join("\n\n");

  if (includeCopyright) {
    return `${formattedPassages}\n\n---\n\n*${searchResult.copyright}*`;
  }
  return formattedPassages.trim();
}

function createClipboardText(prefs: FormattingOptions, searchResult: ReferenceSearchResult) {
  const { includeReferences, includeVerseNumbers, oneVersePerLine } = prefs;

  const formattedPassages = searchResult.passages
    .map((p) => {
      const verses = p.verses
        .map((v) => (includeVerseNumbers ? `[${v.verse}] ${v.text}` : v.text))
        .join(oneVersePerLine ? "\n" : " ");
      if (includeReferences) {
        const reference = `${p.reference} (${getContentsOfLastParenthesis(searchResult.version)})`;
        return `${verses}\n${reference}`;
      }
      return verses;
    })
    .join("\n\n");

  return formattedPassages.trim();
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
