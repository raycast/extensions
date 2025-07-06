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
import { useState, useEffect, useCallback, useMemo } from "react";

import Database from "better-sqlite3";

import path, { resolve } from "path";
import { homedir } from "os";
import { Verse } from "./types";
import { searchVersesFromDB } from "./db";
import {
  cleanseQuery,
  createClipboardText,
  createMarkdown,
  getBibleHubUrlForVerse,
  parseQuery,
  createClipboardTextWithFootnotes,
  getRcvUrlForVerse,
  getVerseRef,
  createVerseList,
  createObsidianLinks,
  getObsidianLink,
} from "./util";

console.log("Node.js version:", process.version); // Debug output for Node.js version

const BASE_PATH = resolve(homedir(), "Documents/dev-tools/search-bible");
const DB_FOLDER = path.join(BASE_PATH, "assets/Bible.SQLite3");
const db = new Database(DB_FOLDER, {
  nativeBinding: path.join(BASE_PATH, "node_modules/better-sqlite3/build/Release/better_sqlite3.node"),
});
type Preferences = Preferences.SearchBible;

export default function Command(props: LaunchProps<{ arguments: Arguments.SearchBible }>) {
  const prefs = getPreferenceValues<Preferences>();
  const { search = "" } = props.arguments;
  const [currentQuery, setQuery] = useState({ search: search });
  const [filter, setFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<Verse[] | undefined>(undefined);
  // const [permissionView, setPermissionView] = useState<JSX.Element | undefined>(undefined);

  useEffect(() => {
    async function setSelectedTextAsQuery() {
      try {
        const query = await getSelectedText();
        console.log("query", query);
        if (query) {
          const { ref } = cleanseQuery(query);
          setQuery((old) => ({ ...old, search: ref }));
        }
      } catch (error) {
        /* empty */
      }
    }

    const isArgsEmpty = Object.keys(props.arguments).length === 0 || props.arguments.search;
    if (isArgsEmpty) {
      setSelectedTextAsQuery();
    }
  }, []);

  const performSearch = useCallback(async () => {
    if (currentQuery.search === "") {
      setSearchResult(undefined);
      return;
    }

    setIsLoading(true);
    try {
      const queryAndMode = { query: parseQuery(currentQuery.search) };
      const verses: Verse[] = await searchVersesFromDB(queryAndMode, db);
      setSearchResult(verses);
      setFilter(queryAndMode.query?.filter || "");
    } catch (error) {
      if (error instanceof Error) {
        showToast({ title: "Error", message: error.message, style: Toast.Style.Failure });
        console.error(error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentQuery.search, filter]);

  useEffect(() => {
    // Don't search when query changes if the user only wants to search when they press enter.
    if (!prefs.enterToSearch) {
      performSearch();
    }
  }, [performSearch, prefs.enterToSearch]);

  const detailContent = useMemo(() => {
    if (!(searchResult && searchResult.length > 0)) return null;
    return {
      markdown: createMarkdown(prefs, searchResult, filter),
      clipboardText: createClipboardText(prefs, searchResult),
      clipboardTextFootnotes: createClipboardTextWithFootnotes(prefs, searchResult),
      obsidianLinks: createObsidianLinks(prefs, searchResult),
      verseList: createVerseList(prefs, searchResult),
    };
  }, [prefs, searchResult, filter]);

  function getEmptyViewText() {
    if (isLoading) {
      return "Searching...";
    } else if (prefs.enterToSearch && searchResult === undefined) {
      return "Press Enter to Search";
    } else if (currentQuery.search === "") {
      return "Start Typing to Search";
    } else {
      return "No Results";
    }
  }

  // TODO: group verses by reference ";" and show the group reference as the title

  const searchAction = <Action title="Search" icon={Icon.Binoculars} onAction={performSearch} />;
  return (
    <List
      isLoading={isLoading}
      isShowingDetail={searchResult && searchResult.length > 0}
      searchText={currentQuery.search}
      throttle={true}
      // searchBarAccessory={
      //   <List.Dropdown
      //     tooltip="Select Bible Version"
      //     onChange={(otnt) => setQuery((old) => ({ ...old, otnt }))}
      //     value={otnt || ""}
      //     defaultValue={"OT+NT"}
      //   >
      //     {MODE.map((mode) => (
      //       <List.Dropdown.Item title={mode} value={mode} key={mode} />
      //     ))}
      //   </List.Dropdown>
      // }
      onSearchTextChange={(newQuery) => setQuery((old) => ({ ...old, search: newQuery }))}
    >
      {searchResult && searchResult.length > 0 && detailContent ? (
        detailContent.markdown.map((item) => (
          <List.Item
            title={item.title}
            detail={
              <List.Item.Detail
                markdown={item.markdown}
                // metadata={
                //   item.footnote ? (
                //     <List.Item.Detail.Metadata>
                //       <List.Item.Detail.Metadata.Separator />
                //       <List.Item.Detail.Metadata.Label title="Footnote" text={item.footnote} />
                //     </List.Item.Detail.Metadata>
                //   ) : (
                //     <List.Item.Detail.Metadata>
                //       <List.Item.Detail.Metadata.Separator />
                //     </List.Item.Detail.Metadata>
                //   )
                // }
              />
            }
            actions={
              <ActionPanel>
                {prefs.enterToSearch && searchAction}
                <Action.CopyToClipboard content={item.detail} />
                <Action.CopyToClipboard
                  title="Copy Footnote to Clipboard"
                  content={item.footnote}
                  shortcut={{
                    modifiers: ["shift"],
                    key: "f",
                  }}
                />
                <Action.CopyToClipboard
                  title="Copy All to Clipboard"
                  content={detailContent.clipboardText}
                  shortcut={{
                    modifiers: ["shift"],
                    key: "enter",
                  }}
                />
                <Action.CopyToClipboard
                  title="Copy All (footnotes) to Clipboard"
                  content={detailContent.clipboardTextFootnotes}
                  shortcut={{
                    modifiers: ["cmd", "shift"],
                    key: "f",
                  }}
                />
                <Action.CopyToClipboard
                  title="Copy Obsidian Links to Clipboard"
                  content={detailContent.obsidianLinks}
                  shortcut={{
                    modifiers: ["cmd", "shift"],
                    key: "l",
                  }}
                />
                <Action.CopyToClipboard
                  title="Copy Obsidian Link to Clipboard"
                  content={getObsidianLink(item.verse)}
                  shortcut={{
                    modifiers: ["cmd"],
                    key: "l",
                  }}
                />
                <Action.Paste
                  title="Paste All"
                  content={detailContent.clipboardText}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                />
                <Action.Paste
                  title="Paste"
                  content={item.detail}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                />
                <Action.OpenInBrowser
                  title="Open Recovery Version"
                  url={getRcvUrlForVerse(item.verse)}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
                <Action.OpenInBrowser
                  title="Open Interlinear"
                  url={getBibleHubUrlForVerse(item.verse)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                />
                <Action.CopyToClipboard
                  title="Copy Verse Reference"
                  content={getVerseRef(item.verse)}
                  shortcut={{ modifiers: ["cmd"], key: "b" }}
                />
                <Action.CopyToClipboard
                  title="Copy Verse References"
                  content={detailContent.verseList}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
                />
              </ActionPanel>
            }
          />
        ))
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
