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
  showHUD,
  confirmAlert,
  open,
  getSelectedFinderItems,
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
  lastUsedSort,
  fixDoubleConcat,
} from "./utils";

import fse from "fs-extra";
import path = require("node:path");

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

  // hack to fix annoying double text during fallback. Typing helloworld results in helloworldhelloworld
  let fixedText = "";
  useEffect(() => {
    fixedText = fixDoubleConcat(searchText);

    if (fixedText !== searchText) {
      setSearchText(fixedText); // Update the state of searchText
    }
  }, [searchText]);

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
        setIsShowingDetail(preferences?.isShowingDetail);
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
      abortable,
      (result: SpotlightSearchResult) => {
        setResults((results) => [result, ...results].sort(lastUsedSort));
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

      // short-circuit for 'pinned'
      if (searchScope === "pinned") {
        setResults(
          pinnedResults.filter((pin) =>
            pin.kMDItemFSName.toLocaleLowerCase().includes(searchText.replace(/[[|\]]/gi, "").toLocaleLowerCase())
          )
        );
        setCanExecute(false);
      } else {
        setCanExecute(true);
      }
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
                      title="Last used"
                      text={result.kMDItemLastUsedDate?.toLocaleString() || "-"}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Use count"
                      text={result.kMDItemUseCount?.toLocaleString() || "-"}
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
                <Action
                  title="Send Finder selection to Folder"
                  icon={Icon.Folder}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                  onAction={async () => {
                    const selectedItems = await getSelectedFinderItems();

                    if (selectedItems.length === 0) {
                      await showHUD(`⚠️  No Finder selection to send.`);
                    } else {
                      for (const item of selectedItems) {
                        // Source path = item
                        // Source file name = path.basename(item)
                        //
                        // Destination folder = result.path
                        // Destination file = result.path + '/' + path.basename(item)

                        const sourceFileName = path.basename(item.path);
                        const destinationFolder = result.path;
                        const destinationFile = result.path + "/" + path.basename(item.path);

                        try {
                          const exists = await fse.pathExists(destinationFile);
                          if (exists) {
                            const overwrite = await confirmAlert({
                              title: "Ooverwrite the existing file?",
                              message: sourceFileName + " already exists in " + destinationFolder,
                            });

                            if (overwrite) {
                              if (item.path == destinationFile) {
                                await showHUD("The source and destination file are the same");
                              }
                              fse.moveSync(item.path, destinationFile, { overwrite: true });
                              await showHUD("Moved file " + path.basename(item.path) + " to " + destinationFolder);
                            } else {
                              await showHUD("Cancelling move");
                            }
                          } else {
                            fse.moveSync(item.path, destinationFile);
                            await showHUD("Moved file " + sourceFileName + " to " + destinationFolder);
                          }

                          open(result.path);
                        } catch (e) {
                          console.error("ERROR " + String(e));
                          await showToast(Toast.Style.Failure, "Error moving file " + String(e));
                        }
                      }
                    }

                    closeMainWindow();
                    popToRoot({ clearSearchBar: true });
                  }}
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
      throttle={true}
      searchText={searchText}
      selectedItemId={selectedItemId}
      searchBarAccessory={
        hasCheckedPlugins && hasCheckedPreferences ? (
          <List.Dropdown tooltip="Scope" onChange={setSearchScope} value={searchScope}>
            <List.Dropdown.Item title="Pinned" value="pinned" />
            <List.Dropdown.Item title="This Mac" value="" />
            <List.Dropdown.Item title={`User (${userInfo().username})`} value={userInfo().homedir} />
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
