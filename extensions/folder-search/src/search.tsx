import { userInfo } from "os";

import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  List,
  LocalStorage,
  Toast,
  closeMainWindow,
  environment,
  popToRoot,
  showToast,
} from "@raycast/api";

import { usePromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";

import { runAppleScript } from "run-applescript";

import { searchSpotlight } from "./search-spotlight";
import { FolderSearchPlugin, SpotlightSearchResult } from "./types";

import {
  loadPlugins,
  folderName,
  enclosingFolderName,
  showFolderInfoInFinder,
  copyFolderToClipboard,
  maybeMoveResultToTrash,
} from "./utils";

// allow string indexing on Icons
interface IconDictionary {
  [id: string]: Icon;
}

const IconDictionaried: IconDictionary = Icon as IconDictionary;

export default function Command() {
  const [searchText, setSearchText] = useState<string>("");
  const [pinnedResults, setPinnedResults] = useState<SpotlightSearchResult[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [searchScope, setSearchScope] = useState<string>("");
  const [isShowingDetail, setIsShowingDetail] = useState<boolean>(true);
  const [results, setResults] = useState<SpotlightSearchResult[]>([]);

  const [plugins, setPlugins] = useState<FolderSearchPlugin[]>([]);

  const [isQuerying, setIsQuerying] = useState<boolean>(false);
  const [canExecute, setCanExecute] = useState<boolean>(false);

  const [hasCheckedPlugins, setHasCheckedPlugins] = useState<boolean>(false);
  const [hasCheckedPreferences, setHasCheckedPreferences] = useState<boolean>(false);

  const abortable = useRef<AbortController>();

  // check plugins
  usePromise(
    async () => {
      const plugins = await loadPlugins();
      setPlugins(plugins);
    },
    [],
    {
      onData() {
        setHasCheckedPlugins(true);
      },
      onError() {
        showToast({
          title: "An Error Occured",
          message: "Could not read plugins",
          style: Toast.Style.Failure,
        });

        setHasCheckedPlugins(true);
      },
    }
  );

  // check prefs
  usePromise(
    async () => {
      const maybePreferences = await LocalStorage.getItem(`${environment.extensionName}-preferences`);

      if (maybePreferences) {
        try {
          return JSON.parse(maybePreferences as string);
        } catch (_) {
          // noop
        }
      }
    },
    [],
    {
      onData(preferences) {
        setPinnedResults(preferences?.pinned || []);
        setSearchScope(preferences?.searchScope || "");
        setIsShowingDetail(preferences?.isShowingDetail || true);
        setHasCheckedPreferences(true);
      },
      onError() {
        showToast({
          title: "An Error Occured",
          message: "Could not read preferences",
          style: Toast.Style.Failure,
        });

        setHasCheckedPreferences(true);
      },
    }
  );

  // perform search
  usePromise(
    searchSpotlight,
    [
      searchText,
      searchScope,
      "kind:folder", // hard-code
      abortable,
      (result: SpotlightSearchResult) => {
        setResults((results) => [result, ...results]);
      },
    ],
    {
      onWillExecute: () => {
        setIsQuerying(true);
        setCanExecute(false);
      },
      onData: () => {
        setIsQuerying(false);
      },
      onError: (e) => {
        if (e.name !== "AbortError") {
          showToast({
            title: "An Error Occured",
            message: "Something went wrong. Try again.",
            style: Toast.Style.Failure,
          });
        }

        setIsQuerying(false);
      },
      execute: hasCheckedPlugins && hasCheckedPreferences && canExecute && !!searchText,
      abortable,
    }
  );

  // save preferences
  useEffect(() => {
    (async () => {
      if (!(hasCheckedPlugins && hasCheckedPreferences)) {
        return;
      }

      await LocalStorage.setItem(
        `${environment.extensionName}-preferences`,
        JSON.stringify({
          pinned: pinnedResults,
          searchScope,
          isShowingDetail,
        })
      );
    })();
  }, [pinnedResults, searchScope, isShowingDetail]);

  useEffect(() => {
    (async () => {
      abortable.current?.abort();

      setResults([]);
      setIsQuerying(false);

      setCanExecute(true);
    })();
  }, [searchText, searchScope]);

  const resultIsPinned = (result: SpotlightSearchResult) => {
    return pinnedResults.map((pin) => pin.path).includes(result.path);
  };

  const removeResultFromPinnedResults = (result: SpotlightSearchResult) => {
    setPinnedResults((pinnedResults) => pinnedResults.filter((pinnedResult) => pinnedResult.path !== result.path));
  };

  const toggleResultPinnedStatus = (result: SpotlightSearchResult, resultIndex: number) => {
    if (!resultIsPinned(result)) {
      setPinnedResults((pinnedResults) => [result, ...pinnedResults]);
    } else {
      // extracted out so we can re-use for maybeMoveResultToTrash calls
      removeResultFromPinnedResults(result);
    }

    setSelectedItemId(`result-${resultIndex.toString()}`);
  };

  // re-usable for results and 'pinned/favourites'
  const ListSection = (props: { title: string; results: SpotlightSearchResult[] }) => {
    return (
      <List.Section title={props.title}>
        {props.results.map((result: SpotlightSearchResult, resultIndex: number) => (
          <List.Item
            id={`result-${resultIndex.toString()}`}
            key={resultIndex}
            title={folderName(result)}
            subtitle={!isShowingDetail ? enclosingFolderName(result) : ""}
            icon={{ fileIcon: result.path }}
            accessories={resultIsPinned(result) ? [{ icon: { source: Icon.Star, tintColor: Color.Yellow } }] : []}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Metadata" />
                    <List.Item.Detail.Metadata.Label title="Name" text={result.kMDItemFSName} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Where" text={result.path} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Type" text={result.kMDItemKind} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Created"
                      text={result.kMDItemFSCreationDate?.toLocaleString()}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Modified"
                      text={result.kMDItemContentModificationDate?.toLocaleString()}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Last opened"
                      text={result.kMDItemLastUsedDate?.toLocaleString() || "-"}
                    />
                    <List.Item.Detail.Metadata.Separator />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel title={folderName(result)}>
                <Action.Open
                  title="Open"
                  icon={Icon.Folder}
                  target={result.path}
                  onOpen={() => popToRoot({ clearSearchBar: true })}
                />
                <Action.ShowInFinder
                  title="Show in Finder"
                  path={result.path}
                  onShow={() => popToRoot({ clearSearchBar: true })}
                />
                <Action.OpenWith
                  title="Open With..."
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                  path={result.path}
                  onOpen={() => popToRoot({ clearSearchBar: true })}
                />
                <Action
                  title="Show Info in Finder"
                  icon={Icon.Finder}
                  shortcut={{ modifiers: ["cmd"], key: "i" }}
                  onAction={() => showFolderInfoInFinder(result)}
                />
                <Action
                  title="Toggle Details"
                  icon={Icon.Sidebar}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  onAction={() => setIsShowingDetail(!isShowingDetail)}
                />
                <Action
                  title={!resultIsPinned(result) ? "Pin" : "Unpin"}
                  icon={!resultIsPinned(result) ? Icon.Star : Icon.StarDisabled}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                  onAction={() => toggleResultPinnedStatus(result, resultIndex)}
                />
                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title="Copy Folder"
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                    content={``}
                    onCopy={() => copyFolderToClipboard(result)}
                  />
                  <Action.CopyToClipboard
                    title="Copy Name"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                    content={folderName(result)}
                  />
                  <Action.CopyToClipboard
                    title="Copy Path"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                    content={result.path}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.CreateQuicklink
                    title="Create Quicklink"
                    icon={Icon.Link}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                    quicklink={{ link: result.path, name: folderName(result) }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Move to Trash"
                    style={Action.Style.Destructive}
                    icon={{ source: Icon.Trash, tintColor: Color.Red }}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => maybeMoveResultToTrash(result, () => removeResultFromPinnedResults(result))}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Plugins">
                  {plugins.map((plugin: FolderSearchPlugin, pluginIndex) => (
                    <Action
                      key={pluginIndex}
                      title={plugin.title}
                      icon={IconDictionaried[plugin.icon]}
                      shortcut={{ ...plugin.shortcut }}
                      onAction={() => {
                        popToRoot({ clearSearchBar: true });
                        closeMainWindow({ clearRootSearch: true });
                        runAppleScript(plugin.appleScript(result));
                      }}
                    />
                  ))}
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    );
  };

  return !(hasCheckedPlugins && hasCheckedPreferences) ? (
    // prevent flicker due to details pref being async
    <Form />
  ) : (
    <List
      isLoading={isQuerying}
      enableFiltering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search folders"
      isShowingDetail={isShowingDetail}
      selectedItemId={selectedItemId}
      searchBarAccessory={
        hasCheckedPlugins && hasCheckedPreferences ? (
          <List.Dropdown tooltip="Scope" onChange={setSearchScope} value={searchScope}>
            <List.Dropdown.Item title="This Mac" value=""></List.Dropdown.Item>
            <List.Dropdown.Item title={`User (${userInfo().username})`} value={userInfo().homedir}></List.Dropdown.Item>
          </List.Dropdown>
        ) : null
      }
    >
      {!searchText ? (
        <ListSection title="Pinned" results={pinnedResults} />
      ) : (
        <ListSection title="Results" results={results} />
      )}
    </List>
  );
}
