import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  List,
  LocalStorage,
  open,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { DirectoryInfo, DirectoryType, SortBy } from "./directory-info";
import React, { useEffect, useState } from "react";
import AddDirectory from "./add-directory";
import { checkPathValid, getOpenFinderWindowPath, preferences } from "./utils";
import { runAppleScript } from "run-applescript";

export default function CommonDirectory() {
  const [searchValue, setSearchValue] = useState<string>("");
  const [commonDirectory, setCommonDirectory] = useState<DirectoryInfo[]>([]);
  const [openDirectory, setOpenDirectory] = useState<DirectoryInfo[]>([]);
  const [updateList, setUpdateList] = useState<number[]>([0]);
  const [loading, setLoading] = useState<boolean>(true);
  const { sortBy, showOpenDirectory } = preferences();
  const { push } = useNavigation();

  useEffect(() => {
    async function _fetchLocalStorage() {
      const _localDirectory = await LocalStorage.getItem(DirectoryType.DIRECTORY);
      const _commonDirectory: DirectoryInfo[] = typeof _localDirectory == "string" ? JSON.parse(_localDirectory) : [];
      if (sortBy === SortBy.NameUp) {
        _commonDirectory.sort(function (a, b) {
          return b.name.toUpperCase() < a.name.toUpperCase() ? 1 : -1;
        });
      } else if (sortBy === SortBy.NameDown) {
        _commonDirectory.sort(function (a, b) {
          return b.name.toUpperCase() > a.name.toUpperCase() ? 1 : -1;
        });
      }
      if (showOpenDirectory) setOpenDirectory(await getOpenFinderWindowPath());
      setCommonDirectory(_commonDirectory);
      setLoading(false);
    }

    _fetchLocalStorage().then();
  }, [updateList]);

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder={"Search Common Directory"}
      onSearchTextChange={(newValue) => {
        setSearchValue(newValue);
      }}
    >
      {commonDirectory.length === 0 ? (
        <List.EmptyView
          title={"No directory. Please add first"}
          description={"You can always add directories from the Action Panel"}
          actions={
            <ActionPanel>
              <Action
                title={"Add Directory"}
                icon={Icon.Download}
                onAction={async () => {
                  push(<AddDirectory updateListUseState={[updateList, setUpdateList]} />);
                }}
              />
            </ActionPanel>
          }
        />
      ) : (
        <>
          <List.Section title={"Common Directory"}>
            {commonDirectory.map((directory, index) => {
              if (
                directory.alias.toLowerCase().includes(searchValue.toLowerCase()) ||
                directory.name.toLowerCase().includes(searchValue.toLowerCase())
              )
                return (
                  <DirectoryItem
                    key={directory.id}
                    directory={directory}
                    setCommonDirectory={setCommonDirectory}
                    index={index}
                    commonDirectory={commonDirectory}
                    updateListUseState={[updateList, setUpdateList]}
                  />
                );
            })}
          </List.Section>
          <List.Section title={"Open Directory"}>
            {openDirectory.map((directory, index) => {
              if (directory.name.toLowerCase().includes(searchValue.toLowerCase()))
                return (
                  <DirectoryItem
                    key={directory.id}
                    directory={directory}
                    setCommonDirectory={setCommonDirectory}
                    index={index}
                    commonDirectory={openDirectory}
                    updateListUseState={[updateList, setUpdateList]}
                  />
                );
            })}
          </List.Section>
        </>
      )}
    </List>
  );
}

function DirectoryItem(props: {
  directory: DirectoryInfo;
  setCommonDirectory: React.Dispatch<React.SetStateAction<DirectoryInfo[]>>;
  index: number;
  commonDirectory: DirectoryInfo[];
  updateListUseState: [number[], React.Dispatch<React.SetStateAction<number[]>>];
}) {
  const directory = props.directory;
  const setCommonDirectory = props.setCommonDirectory;
  const index = props.index;
  const commonDirectory = props.commonDirectory;
  const [updateList, setUpdateList] = props.updateListUseState;
  const { push } = useNavigation();
  const { sortBy } = preferences();
  return (
    <List.Item
      icon={{ fileIcon: directory.path }}
      title={directory.name}
      subtitle={directory.alias}
      accessories={[{ text: directory.path }, { icon: directory.valid ? "✅" : "⚠️" }]}
      actions={
        <ActionPanel>
          <Action
            title={"Reveal in Finder"}
            icon={Icon.Finder}
            onAction={async () => {
              try {
                if (directory.isCommon) {
                  const pathValid = await checkPathValid(directory.path);
                  let _commonDirectory = [...commonDirectory];
                  if (pathValid) {
                    await open(directory.path);
                    await showHUD("Reveal in Finder");
                    _commonDirectory[index].valid = true;
                    if (sortBy === SortBy.Rank) {
                      _commonDirectory = await upRank([..._commonDirectory], index);
                    }
                  } else {
                    await showToast(Toast.Style.Failure, "Path has expired.");
                    _commonDirectory[index].valid = false;
                  }
                  setCommonDirectory(_commonDirectory);
                  await LocalStorage.setItem(DirectoryType.DIRECTORY, JSON.stringify(_commonDirectory));
                } else {
                  await open(directory.path);
                  await showHUD("Reveal in Finder");
                }
              } catch (e) {
                await showToast(Toast.Style.Failure, "Path has expired." + String(e));
              }
            }}
          />
          <Action
            title={"Copy Directory Path"}
            icon={Icon.Clipboard}
            onAction={async () => {
              await Clipboard.copy(directory.path);
              await showToast(Toast.Style.Success, "Directory path copied!");
            }}
          />
          <Action
            title={"Add Directory"}
            icon={Icon.Download}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={async () => {
              push(<AddDirectory updateListUseState={[updateList, setUpdateList]} />);
            }}
          />
          {directory.isCommon && (
            <>
              <Action
                title={"Remove Directory"}
                icon={Icon.Trash}
                shortcut={{ modifiers: ["shift", "cmd"], key: "backspace" }}
                onAction={async () => {
                  const _commonDirectory = [...commonDirectory];
                  _commonDirectory.splice(index, 1);
                  setCommonDirectory(_commonDirectory);
                  await LocalStorage.setItem(DirectoryType.DIRECTORY, JSON.stringify(_commonDirectory));
                  await showToast(Toast.Style.Success, "Remove success!");
                }}
              />
              <Action
                title={"Rest All Rank"}
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["shift", "cmd"], key: "r" }}
                onAction={async () => {
                  const _commonDirectory = [...commonDirectory];
                  _commonDirectory.forEach((directory) => {
                    directory.rank = 1;
                  });
                  _commonDirectory.sort(function (a, b) {
                    return b.name.toUpperCase() < a.name.toUpperCase() ? 1 : -1;
                  });
                  setCommonDirectory(_commonDirectory);
                  await LocalStorage.setItem(DirectoryType.DIRECTORY, JSON.stringify(_commonDirectory));
                  await showToast(Toast.Style.Success, "Reset success!");
                }}
              />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}

async function upRank(directory: DirectoryInfo[], index: number) {
  let allRank = 0;
  directory.forEach((value) => [(allRank = allRank + value.rank)]);
  directory[index].rank = Math.floor((directory[index].rank + 1 - directory[index].rank / allRank) * 100) / 100;
  await LocalStorage.setItem(DirectoryType.DIRECTORY, JSON.stringify(directory));
  directory.sort(function (a, b) {
    return b.rank - a.rank;
  });
  return directory;
}
