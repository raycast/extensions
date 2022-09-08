import { userInfo } from "os";

import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  LocalStorage,
  Toast,
  environment,
  popToRoot,
  showToast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";

import { searchSpotlight } from "./search-spotlight";
import { SpotlightSearchResult } from "./types";

import { folderName, enclosingFolderName, maybeMoveResultToTrash, copyFolderToClipboard } from "./utils";

export default function Command() {
  const [searchText, setSearchText] = useState<string>("");
  const [searchScope, setSearchScope] = useState<string>("");
  const [isShowingDetail, setIsShowingDetail] = useState<boolean>(true);
  const [results, setResults] = useState<SpotlightSearchResult[]>([]);

  const [isQuerying, setIsQuerying] = useState<boolean>(false);
  const [canExecute, setCanExecute] = useState<boolean>(false);

  const [hasCheckedPreferences, setHasCheckedPreferences] = useState<boolean>(false);

  const abortable = useRef<AbortController>();

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
        setSearchScope(preferences.searchScope);
        setIsShowingDetail(preferences.isShowingDetail);
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
      onError: () => {
        showToast({
          title: "An Error Occured",
          message: "Something went wrong. Try again.",
          style: Toast.Style.Failure,
        });

        setIsQuerying(false);
      },
      execute: hasCheckedPreferences && canExecute && !!searchText,
      abortable,
    }
  );

  // save preferences
  useEffect(() => {
    (async () => {
      if (!hasCheckedPreferences) {
        return;
      }

      await LocalStorage.setItem(
        `${environment.extensionName}-preferences`,
        JSON.stringify({
          searchScope,
          isShowingDetail,
        })
      );
    })();
  }, [searchScope, isShowingDetail]);

  useEffect(() => {
    (async () => {
      abortable.current?.abort();

      setResults([]);

      setCanExecute(true);
    })();
  }, [searchText, searchScope]);

  return (
    <List
      isLoading={isQuerying}
      enableFiltering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search folders"
      isShowingDetail={isShowingDetail}
      searchBarAccessory={
        hasCheckedPreferences ? (
          <List.Dropdown tooltip="Scope" onChange={setSearchScope} value={searchScope}>
            <List.Dropdown.Item title="This Mac" value=""></List.Dropdown.Item>
            <List.Dropdown.Item title={`User (${userInfo().username})`} value={userInfo().homedir}></List.Dropdown.Item>
          </List.Dropdown>
        ) : null
      }
    >
      <List.Section title={"Results"}>
        {results.map((result: SpotlightSearchResult, resultIndex: number) => (
          <List.Item
            key={resultIndex}
            title={folderName(result)}
            subtitle={!isShowingDetail ? enclosingFolderName(result) : ""}
            icon={{ fileIcon: result.path }}
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
                <Action
                  title="Toggle Details"
                  icon={Icon.Sidebar}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  onAction={() => setIsShowingDetail(!isShowingDetail)}
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
                  <Action
                    title="Move to Trash"
                    style={Action.Style.Destructive}
                    icon={{ source: Icon.Trash, tintColor: Color.Red }}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => maybeMoveResultToTrash(result)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
