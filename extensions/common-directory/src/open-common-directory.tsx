import { Action, ActionPanel, Icon, List, LocalStorage, showToast, Toast } from "@raycast/api";
import { DirectoryInfo, LocalDirectoryKey, SortBy } from "./utils/directory-info";
import React, { useState } from "react";
import AddCommonDirectory from "./add-common-directory";
import { commonPreferences, isEmpty } from "./utils/common-utils";
import path from "path";
import { setShowDetailLocalStorage, ShowDetailKey } from "./utils/ui-utils";
import {
  alertDialog,
  getCommonDirectory,
  getDirectory,
  getDirectoryInfo,
  getIsShowDetail,
  refreshNumber,
} from "./hooks/hooks";
import { CopyFileActions } from "./utils/ui-component";

export default function OpenCommonDirectory() {
  const { sortBy, showOpenDirectory } = commonPreferences();
  const [searchValue, setSearchValue] = useState<string>("");
  const [directoryPath, setDirectoryPath] = useState<string>("");
  const [refresh, setRefresh] = useState<number>(0);
  const [refreshDetail, setRefreshDetail] = useState<number>(0);

  //hooks
  const showDetail = getIsShowDetail(refreshDetail, ShowDetailKey.OPEN_COMMON_DIRECTORY);
  const { commonDirectory, openDirectory, loading } = getCommonDirectory(
    refresh,
    sortBy,
    showOpenDirectory,
    LocalDirectoryKey.OPEN_COMMON_DIRECTORY
  );
  const directoryInfo = getDirectoryInfo(directoryPath);

  return (
    <List
      isLoading={loading}
      isShowingDetail={
        showDetail && (commonDirectory.length !== 0 || (showOpenDirectory && openDirectory.length !== 0))
      }
      searchBarPlaceholder={"Search directories"}
      onSearchTextChange={(newValue) => {
        setSearchValue(newValue);
      }}
      onSelectionChange={(id) => {
        if (typeof id === "string") {
          const idContent = JSON.parse(id);
          setDirectoryPath(idContent.path);
        } else {
          setDirectoryPath("");
        }
      }}
    >
      {(commonDirectory.length === 0 && showOpenDirectory && openDirectory.length === 0) ||
      (commonDirectory.length === 0 && !showOpenDirectory) ? (
        <List.EmptyView
          title={"No directory. Please add first"}
          description={"You can always add directories from the Action Panel"}
          actions={
            <ActionPanel>
              <Action.Push
                title={"Add Directory"}
                icon={Icon.Plus}
                target={<AddCommonDirectory setRefresh={setRefresh} />}
              />
              <Action
                title={"Toggle Details"}
                icon={Icon.Sidebar}
                shortcut={{ modifiers: ["shift", "cmd"], key: "d" }}
                onAction={() => {
                  setRefreshDetail(refreshNumber());
                  setShowDetailLocalStorage(ShowDetailKey.OPEN_COMMON_DIRECTORY, !showDetail).then();
                }}
              />
            </ActionPanel>
          }
        />
      ) : (
        <>
          <List.Section title={"Common Directories"}>
            {!loading &&
              commonDirectory.map((directory, index) => {
                if (
                  directory.alias.toLowerCase().includes(searchValue.toLowerCase()) ||
                  directory.name.toLowerCase().includes(searchValue.toLowerCase())
                )
                  return (
                    <DirectoryItem
                      key={directory.id}
                      directory={directory}
                      index={index}
                      commonDirectory={commonDirectory}
                      directoryInfo={directoryInfo}
                      showDetail={showDetail}
                      setRefresh={setRefresh}
                      setRefreshDetail={setRefreshDetail}
                    />
                  );
              })}
          </List.Section>
          <List.Section title={"Open Directories"}>
            {!loading &&
              openDirectory.map((directory, index) => {
                if (directory.name.toLowerCase().includes(searchValue.toLowerCase()))
                  return (
                    <DirectoryItem
                      key={directory.id}
                      directory={directory}
                      index={index}
                      commonDirectory={openDirectory}
                      directoryInfo={directoryInfo}
                      showDetail={showDetail}
                      setRefresh={setRefresh}
                      setRefreshDetail={setRefreshDetail}
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
  index: number;
  commonDirectory: DirectoryInfo[];
  directoryInfo: string;
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
  showDetail: boolean;
  setRefreshDetail: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { directory, setRefresh, setRefreshDetail, index, commonDirectory, showDetail, directoryInfo } = props;
  return (
    <List.Item
      id={JSON.stringify({ type: directory.isCommon, path: directory.path })}
      icon={{ fileIcon: directory.path }}
      title={directory.name}
      subtitle={showDetail ? "" : directory.alias}
      detail={<List.Item.Detail markdown={directoryInfo} />}
      accessories={
        showDetail
          ? [{ text: isEmpty(directory.alias) ? " " : directory.alias }, directory.valid ? {} : { icon: "⚠️" }]
          : [{ text: path.parse(directory.path).dir }, directory.valid ? {} : { icon: "⚠️" }]
      }
      actions={
        <ActionPanel>
          <Action.Open
            title="Open"
            target={directory.path}
            onOpen={() => openAndUpRank(directory, index, commonDirectory)}
          />
          <Action.ShowInFinder path={directory.path} onShow={() => openAndUpRank(directory, index, commonDirectory)} />

          <CopyFileActions directory={directory} />

          <ActionPanel.Section title={"Directory Action"}>
            <Action.Push
              title={"Add Directory"}
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              target={<AddCommonDirectory setRefresh={setRefresh} />}
            />
            {directory.isCommon && (
              <>
                <Action
                  title={"Remove Directory"}
                  icon={Icon.Trash}
                  shortcut={{ modifiers: ["cmd", "ctrl"], key: "x" }}
                  onAction={async () => {
                    const _openCommonDirectory = [...commonDirectory];
                    _openCommonDirectory.splice(index, 1);
                    await LocalStorage.setItem(
                      LocalDirectoryKey.OPEN_COMMON_DIRECTORY,
                      JSON.stringify(_openCommonDirectory)
                    );
                    setRefresh(refreshNumber);
                    const _sendCommonDirectory = await getDirectory(
                      LocalDirectoryKey.SEND_COMMON_DIRECTORY,
                      commonPreferences().sortBy
                    );
                    const __sendCommonDirectory = _sendCommonDirectory.filter((value) => {
                      return value.path !== directory.path;
                    });
                    await LocalStorage.setItem(
                      LocalDirectoryKey.SEND_COMMON_DIRECTORY,
                      JSON.stringify(__sendCommonDirectory)
                    );
                    await showToast(Toast.Style.Success, "Removed successfully!");
                  }}
                />
                <Action
                  title={"Remove All Directory"}
                  icon={Icon.ExclamationMark}
                  shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                  onAction={async () => {
                    await alertDialog("⚠️Warning", "Do you want to remove all directories?", "Remove All", async () => {
                      await LocalStorage.setItem(LocalDirectoryKey.OPEN_COMMON_DIRECTORY, JSON.stringify([]));
                      await LocalStorage.setItem(LocalDirectoryKey.SEND_COMMON_DIRECTORY, JSON.stringify([]));
                      setRefresh(refreshNumber);
                      await showToast(Toast.Style.Success, "Removed All successfully!");
                    });
                  }}
                />
              </>
            )}
            <Action
              title={"Rest All Rank"}
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["ctrl", "shift"], key: "r" }}
              onAction={() => {
                resetRank(commonDirectory, setRefresh).then(async () => {
                  await showToast(Toast.Style.Success, "Reset successfully!");
                });
              }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title={"Detail Action"}>
            <Action
              title={"Toggle Details"}
              icon={Icon.Sidebar}
              shortcut={{ modifiers: ["shift", "ctrl"], key: "d" }}
              onAction={() => {
                setShowDetailLocalStorage(ShowDetailKey.OPEN_COMMON_DIRECTORY, !showDetail).then();
                setRefreshDetail(refreshNumber());
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

async function openAndUpRank(directoryPath: DirectoryInfo, index: number, commonDirectory: DirectoryInfo[]) {
  try {
    let _commonDirectory = [...commonDirectory];
    if (commonPreferences().sortBy === SortBy.Rank) {
      _commonDirectory = await upRank([..._commonDirectory], index);
    }
    if (directoryPath.isCommon) {
      await LocalStorage.setItem(LocalDirectoryKey.OPEN_COMMON_DIRECTORY, JSON.stringify(_commonDirectory));
    }
  } catch (e) {
    console.error(String(e));
  }
}

async function upRank(directories: DirectoryInfo[], index: number) {
  const moreHighRank = directories.filter((value) => {
    return value.path !== directories[index].path && value.rank >= directories[index].rank;
  });
  if (moreHighRank.length == 0) {
    return directories;
  }
  let allRank = 0;
  directories.forEach((value) => [(allRank = allRank + value.rank)]);
  directories[index].rank = Math.floor((directories[index].rank + 1 - directories[index].rank / allRank) * 100) / 100;
  directories.sort(function (a, b) {
    return b.rank - a.rank;
  });
  return directories;
}

export async function resetRank(
  commonDirectory: DirectoryInfo[],
  setRefresh: React.Dispatch<React.SetStateAction<number>>
) {
  const _commonDirectory = [...commonDirectory];
  _commonDirectory.forEach((directory) => {
    directory.rank = 1;
    directory.rankSendFile = 1;
  });
  _commonDirectory.sort(function (a, b) {
    return b.name.toUpperCase() < a.name.toUpperCase() ? 1 : -1;
  });
  await LocalStorage.setItem(LocalDirectoryKey.OPEN_COMMON_DIRECTORY, JSON.stringify(_commonDirectory));
  await LocalStorage.setItem(LocalDirectoryKey.SEND_COMMON_DIRECTORY, JSON.stringify(_commonDirectory));
  setRefresh(refreshNumber());
}
