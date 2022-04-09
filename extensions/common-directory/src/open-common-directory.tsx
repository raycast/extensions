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
import { DirectoryInfo, LocalDirectoryKey, SortBy } from "./utils/directory-info";
import React, { useEffect, useState } from "react";
import AddCommonDirectory from "./add-common-directory";
import { getOpenFinderWindowPath, preferences } from "./utils/utils";
import { homedir } from "os";
import path from "path";
import fs from "fs-extra";

export default function OpenCommonDirectory() {
  const [searchValue, setSearchValue] = useState<string>("");
  const [commonDirectory, setCommonDirectory] = useState<DirectoryInfo[]>([]);
  const [openDirectory, setOpenDirectory] = useState<DirectoryInfo[]>([]);
  const [updateList, setUpdateList] = useState<number[]>([0]);
  const [loading, setLoading] = useState<boolean>(true);
  const { sortBy, showOpenDirectory } = preferences();
  const { push } = useNavigation();
  const homeDirectory = homedir();

  useEffect(() => {
    async function _fetchLocalStorage() {
      setCommonDirectory(await getDirectory(LocalDirectoryKey.OPEN_COMMON_DIRECTORY, sortBy));
      if (showOpenDirectory) {
        setOpenDirectory(await getOpenFinderWindowPath());
      }
      setLoading(false);
    }

    _fetchLocalStorage().then();
  }, [updateList]);

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder={"Search and open"}
      onSearchTextChange={(newValue) => {
        setSearchValue(newValue);
      }}
    >
      {(commonDirectory.length === 0 && showOpenDirectory && openDirectory.length === 0) ||
      (commonDirectory.length === 0 && !showOpenDirectory) ? (
        <List.EmptyView
          title={"No directory. Please add first"}
          description={"You can always add directories from the Action Panel"}
          actions={
            <ActionPanel>
              <Action
                title={"Add Directory"}
                icon={Icon.Download}
                onAction={async () => {
                  push(<AddCommonDirectory updateListUseState={[updateList, setUpdateList]} />);
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
                    homeDirectory={homeDirectory}
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
                    homeDirectory={homeDirectory}
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
  homeDirectory: string;
  directory: DirectoryInfo;
  setCommonDirectory: React.Dispatch<React.SetStateAction<DirectoryInfo[]>>;
  index: number;
  commonDirectory: DirectoryInfo[];
  updateListUseState: [number[], React.Dispatch<React.SetStateAction<number[]>>];
}) {
  const { homeDirectory, directory, setCommonDirectory, index, commonDirectory } = props;
  const [updateList, setUpdateList] = props.updateListUseState;
  const { push } = useNavigation();
  const { sortBy } = preferences();
  return (
    <List.Item
      icon={{ fileIcon: directory.path }}
      title={directory.name}
      subtitle={directory.alias}
      accessories={[
        { text: "~" + directory.path.substring(homeDirectory.length) },
        directory.valid ? {} : { icon: "⚠️" },
      ]}
      actions={
        <ActionPanel>
          <Action
            title={"Open in Finder"}
            icon={Icon.Window}
            onAction={async () => {
              await openOrRevealInFinder(directory, index, commonDirectory, sortBy, setCommonDirectory, true);
            }}
          />
          <Action
            title={"Reveal in Finder"}
            icon={Icon.Finder}
            onAction={async () => {
              await openOrRevealInFinder(directory, index, commonDirectory, sortBy, setCommonDirectory, false);
            }}
          />
          <Action
            title={"Copy Directory Path"}
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
            onAction={async () => {
              await Clipboard.copy(directory.path);
              await showToast(Toast.Style.Success, "Directory path copied!");
            }}
          />

          <ActionPanel.Section title={"Directory Action"}>
            <Action
              title={"Add Directory"}
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              onAction={() => {
                push(<AddCommonDirectory updateListUseState={[updateList, setUpdateList]} />);
              }}
            />
            {directory.isCommon && (
              <>
                <Action
                  title={"Remove Directory"}
                  icon={Icon.Trash}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  onAction={async () => {
                    const _openCommonDirectory = [...commonDirectory];
                    _openCommonDirectory.splice(index, 1);
                    setCommonDirectory(_openCommonDirectory);
                    await LocalStorage.setItem(
                      LocalDirectoryKey.OPEN_COMMON_DIRECTORY,
                      JSON.stringify(_openCommonDirectory)
                    );

                    const _sendCommonDirectory = await getDirectory(LocalDirectoryKey.SEND_COMMON_DIRECTORY, sortBy);
                    const __sendCommonDirectory = _sendCommonDirectory.filter((value) => {
                      return value.path !== directory.path;
                    });
                    await LocalStorage.setItem(
                      LocalDirectoryKey.SEND_COMMON_DIRECTORY,
                      JSON.stringify(__sendCommonDirectory)
                    );
                    await showToast(Toast.Style.Success, "Remove success!");
                  }}
                />
                <Action
                  title={"Rest All Rank"}
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => {
                    resetRank(commonDirectory, setCommonDirectory).then(async () => {
                      await showToast(Toast.Style.Success, "Reset success!");
                    });
                  }}
                />
              </>
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export async function getDirectory(key: string, sortBy: string) {
  const _localDirectory = await LocalStorage.getItem(key);
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
  return _commonDirectory;
}

async function openOrRevealInFinder(
  directoryPath: DirectoryInfo,
  index: number,
  commonDirectory: DirectoryInfo[],
  sortBy: string,
  setCommonDirectory: React.Dispatch<React.SetStateAction<DirectoryInfo[]>>,
  isOpen: boolean
) {
  try {
    if (commonDirectory[index].isCommon) {
      const actualPath = isOpen ? directoryPath.path : path.parse(directoryPath.path).dir;
      const pathValid = fs.pathExistsSync(actualPath);
      let _commonDirectory = [...commonDirectory];
      if (pathValid) {
        await open(actualPath);
        await showHUD(isOpen ? "Open in Finder" : "Reveal in Finder");
        if (isOpen) {
          _commonDirectory[index].valid = true;
        }
        if (sortBy === SortBy.Rank) {
          _commonDirectory = await upRank([..._commonDirectory], index);
        }
      } else {
        await showToast(Toast.Style.Failure, "Path has expired.");
        if (isOpen) {
          _commonDirectory[index].valid = false;
        }
      }
      setCommonDirectory(_commonDirectory);
      await LocalStorage.setItem(LocalDirectoryKey.OPEN_COMMON_DIRECTORY, JSON.stringify(_commonDirectory));
    } else {
      const actualPath = isOpen ? directoryPath.path : path.parse(directoryPath.path).dir;
      await open(actualPath);
      await showHUD(isOpen ? "Open in Finder" : "Reveal in Finder");
    }
  } catch (e) {
    await showToast(Toast.Style.Failure, "Path has expired." + String(e));
  }
}

async function upRank(directory: DirectoryInfo[], index: number) {
  let allRank = 0;
  directory.forEach((value) => [(allRank = allRank + value.rank)]);
  directory[index].rank = Math.floor((directory[index].rank + 1 - directory[index].rank / allRank) * 100) / 100;
  directory.sort(function (a, b) {
    return b.rank - a.rank;
  });
  return directory;
}

export async function resetRank(
  commonDirectory: DirectoryInfo[],
  setCommonDirectory: React.Dispatch<React.SetStateAction<DirectoryInfo[]>>
) {
  const _commonDirectory = [...commonDirectory];
  _commonDirectory.forEach((directory) => {
    directory.rank = 1;
    directory.rankSendFile = 1;
  });
  _commonDirectory.sort(function (a, b) {
    return b.name.toUpperCase() < a.name.toUpperCase() ? 1 : -1;
  });
  setCommonDirectory(_commonDirectory);
  await LocalStorage.setItem(LocalDirectoryKey.OPEN_COMMON_DIRECTORY, JSON.stringify(_commonDirectory));
  await LocalStorage.setItem(LocalDirectoryKey.SEND_COMMON_DIRECTORY, JSON.stringify(_commonDirectory));
}
