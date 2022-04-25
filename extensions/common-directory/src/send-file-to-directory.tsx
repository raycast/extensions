import { Action, ActionPanel, Icon, List, LocalStorage, showToast, Toast } from "@raycast/api";
import { DirectoryInfo, LocalDirectoryKey, SortBy } from "./utils/directory-info";
import React, { useState } from "react";
import { commonPreferences, getChooseFolder, isEmpty } from "./utils/common-utils";
import { ActionType, getItemAndSend } from "./utils/send-file-utils";
import { resetRank } from "./open-common-directory";
import fse from "fs-extra";
import AddCommonDirectory from "./add-common-directory";
import { setShowDetailLocalStorage, ShowDetailKey } from "./utils/ui-utils";
import path from "path";
import {
  alertDialog,
  getCommonDirectory,
  getDirectory,
  getDirectoryInfo,
  getIsShowDetail,
  refreshNumber,
} from "./hooks/hooks";
import { CopyFileActions } from "./utils/ui-component";

export default function CommonDirectory() {
  const { sortBy, showOpenDirectory } = commonPreferences();
  const [searchValue, setSearchValue] = useState<string>("");
  const [directoryPath, setDirectoryPath] = useState<string>("");

  const [updateDetail, setUpdateDetail] = useState<number>(0);
  const [refresh, setRefresh] = useState<number>(0);
  const [refreshDetail, setRefreshDetail] = useState<number>(0);

  //hooks
  const showDetail = getIsShowDetail(refreshDetail, ShowDetailKey.SEND_COMMON_DIRECTORY);
  const { commonDirectory, openDirectory, loading } = getCommonDirectory(
    refresh,
    sortBy,
    showOpenDirectory,
    LocalDirectoryKey.SEND_COMMON_DIRECTORY
  );
  const directoryInfo = getDirectoryInfo(directoryPath, updateDetail);

  return (
    <List
      isLoading={loading}
      isShowingDetail={
        showDetail && (commonDirectory.length !== 0 || (showOpenDirectory && openDirectory.length !== 0))
      }
      searchBarPlaceholder={"Send files to"}
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
          description={"You can add directories from the Action Panel"}
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
                  setShowDetailLocalStorage(ShowDetailKey.OPEN_COMMON_DIRECTORY, !showDetail).then();
                  setRefreshDetail(refreshDetail);
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
                    <SendToDirectoryItem
                      key={directory.id}
                      directory={directory}
                      index={index}
                      commonDirectory={commonDirectory}
                      directoryContent={directoryInfo}
                      showDetail={showDetail}
                      setRefresh={setRefresh}
                      setRefreshDetail={setRefreshDetail}
                      setUpdateDetail={setUpdateDetail}
                    />
                  );
              })}
          </List.Section>
          <List.Section title={"Open Directories"}>
            {!loading &&
              openDirectory.map((directory, index) => {
                if (directory.name.toLowerCase().includes(searchValue.toLowerCase()))
                  return (
                    <SendToDirectoryItem
                      key={directory.id}
                      directory={directory}
                      index={index}
                      commonDirectory={openDirectory}
                      directoryContent={directoryInfo}
                      showDetail={showDetail}
                      setRefresh={setRefresh}
                      setRefreshDetail={setRefreshDetail}
                      setUpdateDetail={setUpdateDetail}
                    />
                  );
              })}
          </List.Section>
        </>
      )}
    </List>
  );
}

function SendToDirectoryItem(props: {
  directory: DirectoryInfo;
  index: number;
  commonDirectory: DirectoryInfo[];
  directoryContent: string;
  showDetail: boolean;
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
  setRefreshDetail: React.Dispatch<React.SetStateAction<number>>;
  setUpdateDetail: React.Dispatch<React.SetStateAction<number>>;
}) {
  const {
    directory,
    showDetail,
    setRefresh,
    setRefreshDetail,
    setUpdateDetail,
    index,
    commonDirectory,
    directoryContent,
  } = props;
  const { primaryAction } = commonPreferences();
  return (
    <List.Item
      id={JSON.stringify({ type: directory.isCommon, path: directory.path })}
      icon={{ fileIcon: directory.path }}
      title={directory.name}
      subtitle={showDetail ? "" : directory.alias}
      accessories={
        showDetail
          ? [{ text: isEmpty(directory.alias) ? " " : directory.alias }, directory.valid ? {} : { icon: "⚠️" }]
          : [{ text: path.parse(directory.path).dir }, directory.valid ? {} : { icon: "⚠️" }]
      }
      detail={<List.Item.Detail markdown={directoryContent} />}
      actions={
        <ActionPanel>
          <Action
            title={primaryAction === ActionType.COPY ? "Copy to Directory" : "Move to Directory"}
            icon={primaryAction === ActionType.COPY ? Icon.Clipboard : Icon.Download}
            onAction={async () => {
              await actionMoveOrCopy(directory, commonDirectory, index, primaryAction, false);
              setUpdateDetail(refreshNumber());
            }}
          />
          <Action
            title={primaryAction === ActionType.COPY ? "Move to Directory" : "Copy to Directory"}
            icon={primaryAction === ActionType.COPY ? Icon.Download : Icon.Clipboard}
            onAction={async () => {
              if (primaryAction === ActionType.COPY) {
                await actionMoveOrCopy(directory, commonDirectory, index, ActionType.MOVE, false);
              } else {
                await actionMoveOrCopy(directory, commonDirectory, index, ActionType.COPY, false);
              }
              setUpdateDetail(refreshNumber());
            }}
          />
          <ActionPanel.Section title={"Advanced Action"}>
            <Action
              title={
                primaryAction === ActionType.COPY ? "Copy to Folder Chosen Manually" : "Move to Folder Chosen Manually"
              }
              icon={primaryAction === ActionType.COPY ? Icon.Clipboard : Icon.Download}
              shortcut={{ modifiers: ["shift", "cmd"], key: "m" }}
              onAction={async () => {
                await actionMoveOrCopy(directory, commonDirectory, index, primaryAction, true);
                setUpdateDetail(refreshNumber());
              }}
            />
            <Action
              title={
                primaryAction === ActionType.COPY ? "Move to Folder Chosen Manually" : "Copy to Folder Chosen Manually"
              }
              icon={primaryAction === ActionType.COPY ? Icon.Download : Icon.Clipboard}
              shortcut={{ modifiers: ["shift", "cmd"], key: "c" }}
              onAction={async () => {
                if (primaryAction === ActionType.COPY) {
                  await actionMoveOrCopy(directory, commonDirectory, index, ActionType.MOVE, true);
                } else {
                  await actionMoveOrCopy(directory, commonDirectory, index, ActionType.COPY, true);
                }
                setUpdateDetail(refreshNumber());
              }}
            />
          </ActionPanel.Section>

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
                    const _sendCommonDirectory = [...commonDirectory];
                    _sendCommonDirectory.splice(index, 1);
                    await LocalStorage.setItem(
                      LocalDirectoryKey.SEND_COMMON_DIRECTORY,
                      JSON.stringify(_sendCommonDirectory)
                    );
                    setRefresh(refreshNumber());

                    const _openCommonDirectory = await getDirectory(LocalDirectoryKey.OPEN_COMMON_DIRECTORY, "Rank");
                    const __openCommonDirectory = _openCommonDirectory.filter((value) => {
                      return value.path !== directory.path;
                    });
                    await LocalStorage.setItem(
                      LocalDirectoryKey.OPEN_COMMON_DIRECTORY,
                      JSON.stringify(__openCommonDirectory)
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
                      setRefresh(refreshNumber());
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
                setShowDetailLocalStorage(ShowDetailKey.SEND_COMMON_DIRECTORY, !showDetail).then();
                setRefreshDetail(refreshNumber());
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

async function actionMoveOrCopy(
  directory: DirectoryInfo,
  commonDirectory: DirectoryInfo[],
  index: number,
  action: ActionType,
  manual: boolean
) {
  try {
    await showToast(Toast.Style.Animated, `${action == ActionType.COPY ? "Copying" : "Moving"}... Don't quit.`);
    let _commonDirectory = [...commonDirectory];
    const pathValid = fse.pathExistsSync(directory.path);
    if (pathValid) {
      let isMoved: boolean;
      if (manual) {
        isMoved = await actionByChooseFolder(action);
      } else {
        isMoved = await getItemAndSend(directory.path, action);
      }
      _commonDirectory[index].valid = true;
      if (isMoved && commonPreferences().sortBy === SortBy.Rank) {
        _commonDirectory = await upRankSendFile(_commonDirectory, index);
      }
    } else {
      await showToast(Toast.Style.Failure, "Error!", "Path has expired.");
      _commonDirectory[index].valid = false;
    }
    if (directory.isCommon) {
      await LocalStorage.setItem(LocalDirectoryKey.SEND_COMMON_DIRECTORY, JSON.stringify(_commonDirectory));
    }
  } catch (e) {
    await showToast(Toast.Style.Failure, "Error!", "Path has expired." + String(e));
  }
}

async function actionByChooseFolder(action: ActionType) {
  const destPath = await getChooseFolder();
  return await getItemAndSend(destPath, action);
}

async function upRankSendFile(directories: DirectoryInfo[], index: number) {
  const moreHighRank = directories.filter((value) => {
    return value.path !== directories[index].path && value.rankSendFile >= directories[index].rankSendFile;
  });
  if (moreHighRank.length == 0) {
    return directories;
  }
  let allRank = 0;
  directories.forEach((value) => [(allRank = allRank + value.rankSendFile)]);
  directories[index].rankSendFile =
    Math.floor((directories[index].rankSendFile + 1 - directories[index].rankSendFile / allRank) * 100) / 100;
  directories.sort(function (a, b) {
    return b.rankSendFile - a.rankSendFile;
  });
  return directories;
}
