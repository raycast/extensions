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
import { FormattingOptions, ReferenceSearchResult } from "./types";
import { useBibleSearch } from "./useBibleSearch";
import { DEFAULT_BIBLE_VERSION, useBibleVersion } from "./useBibleVersion";

type Preferences = Preferences.BibleSearch;

export default function Command(props: LaunchProps<{ arguments: Partial<Arguments.BibleSearch> }>) {
  const { includeCopyright, includeVerseNumbers, includeReferences, oneVersePerLine, separatePassages } =
    getPreferenceValues<Preferences>();

  const { ref: initialRef, version: initialVersion } = props.arguments;
  const parsedVersion = initialVersion ? versionFromAbbrev(initialVersion, bibleVersions) : undefined;

  const [ref, setRef] = React.useState(initialRef ?? "");
  const [version, setVersion] = useBibleVersion(parsedVersion?.id);

  const { data: searchResult, isLoading, error } = useBibleSearch({ search: ref, version: version });

  React.useEffect(() => {
    // If opened with a hotkey, the arguments will be undefined
    const isHotkeyLaunch = initialRef === undefined && initialVersion === undefined;
    // If not launched with a hotkey, but provided no arguments (user triggers command without typing anything),
    // the arguments will be empty strings
    const launchedWithNoArguments = initialRef === "" && initialVersion === "";
    // In either of these cases, try to get the selected text and use that as the search query
    if (isHotkeyLaunch || launchedWithNoArguments) {
      getSelectedText()
        .then((selectedText) => {
          if (selectedText.trim()) {
            const parsed = parseReference(selectedText);
            setRef(parsed.ref);
            if (parsed.version) {
              setVersion(parsed.version);
            }
          }
        })
        .catch(() => {
          // No text is selected – do nothing
        });
    }
  }, [initialRef, initialVersion]);

  React.useEffect(() => {
    if (error) {
      showToast({ title: "Error", message: error.message, style: Toast.Style.Failure });
    }
  }, [error]);

  function renderSearchResults() {
    if (!searchResult || searchResult.passages.length === 0) {
      return (
        <List.EmptyView
          title={isLoading ? "Searching..." : ref === "" ? "Start Typing to Search" : "No Results"}
          icon="../assets/extension-icon-64.png"
        />
      );
    }
    const formattingOptions: FormattingOptions = {
      includeCopyright,
      includeVerseNumbers,
      includeReferences,
      oneVersePerLine,
    };
    const copyShortcut: Keyboard.Shortcut = {
      macOS: { modifiers: ["cmd", "shift"], key: "enter" },
      windows: { modifiers: ["ctrl", "shift"], key: "enter" },
    };
    if (!separatePassages) {
      const markdown = createMarkdown(formattingOptions, searchResult);
      const clipboardText = createClipboardText(formattingOptions, searchResult);
      return (
        <List.Item
          title={searchResult.passages.map((p) => p.reference).join("; ")}
          detail={<List.Item.Detail markdown={markdown} />}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={clipboardText} />
              <Action.Paste content={clipboardText} shortcut={copyShortcut} />
              {searchResult.url && (
                <Action.OpenInBrowser
                  title={`Open at ${searchResult.url.hostname}`}
                  url={searchResult.url.toString()}
                  shortcut={Keyboard.Shortcut.Common.Open}
                />
              )}
            </ActionPanel>
          }
        />
      );
    }
    return searchResult.passages.map((passage) => {
      // Create a temporary search result with just this passage
      const passageUrl = searchResult.url ? new URL(searchResult.url) : undefined;
      passageUrl?.searchParams.set("search", passage.reference);
      const passageResult = { ...searchResult, passages: [passage], url: passageUrl };

      const markdown = createMarkdown(formattingOptions, passageResult);
      const clipboardText = createClipboardText(formattingOptions, passageResult);
      return (
        <List.Item
          key={passage.reference}
          title={passage.reference}
          detail={<List.Item.Detail markdown={markdown} />}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={clipboardText} />
              <Action.Paste content={clipboardText} shortcut={copyShortcut} />
              {passageResult.url && (
                <Action.OpenInBrowser
                  title={`Open at ${passageResult.url.hostname}`}
                  url={passageResult.url.toString()}
                  shortcut={Keyboard.Shortcut.Common.Open}
                />
              )}
            </ActionPanel>
          }
        />
      );
    });
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={searchResult && searchResult.passages.length > 0}
      searchText={ref}
      throttle={true}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Bible Version"
          onChange={(version) => setVersion(version)}
          value={version ?? DEFAULT_BIBLE_VERSION}
        >
          {bibleVersions.map(({ id, name, abbrev }) => (
            <List.Dropdown.Item title={`${name} (${abbrev})`} value={id} key={id} />
          ))}
        </List.Dropdown>
      }
      onSearchTextChange={(search) => setRef(search)}
    >
      {renderSearchResults()}
    </List>
  );
}

function createMarkdown(prefs: FormattingOptions, searchResult: ReferenceSearchResult) {
  const { includeCopyright, includeReferences, includeVerseNumbers, oneVersePerLine } = prefs;

  const formattedPassages = searchResult.passages
    .map((passage) => {
      const verses =
        typeof passage.verses == "string"
          ? passage.verses
          : passage.verses
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
      const verses =
        typeof p.verses == "string"
          ? p.verses
          : p.verses
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
  const parts = trimmedReference.split(" ");
  const lastWord = parts.pop();
  const version = lastWord ? versionFromAbbrev(lastWord, bibleVersions) : undefined;
  const refWithoutVersion = lastWord && version ? parts.join(" ") : trimmedReference;
  return { ref: refWithoutVersion, version: version?.id };
}

function versionFromAbbrev(maybeVersionAbbrev: string, validVersions: typeof bibleVersions) {
  maybeVersionAbbrev = maybeVersionAbbrev
    .replace(/[()[\]]/gi, "") // remove brackets and parentheses
    .toUpperCase();
  return validVersions.find(({ abbrev }) => abbrev === maybeVersionAbbrev);
}
