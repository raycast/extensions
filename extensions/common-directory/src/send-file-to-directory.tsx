import { Action, ActionPanel, getPreferenceValues, Icon, List, LocalStorage, showToast, Toast } from "@raycast/api";
import { DirectoryInfo, LocalDirectoryKey, SortBy } from "./types/directory-info";
import React, { useState } from "react";
import { isEmpty } from "./utils/common-utils";
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
import { ActionOpenCommandPreferences } from "./components/action-open-command-preferences";
import { ActionCopyFile } from "./components/action-copy-file";
import { Preferences } from "./types/preferences";
import { FileContentInfo } from "./types/file-content-info";
import { DirectoryDetailMetadata } from "./components/directory-detail-metadata";
import { ListEmptyView } from "./components/list-empty-view";
import { FolderPage } from "./components/folder-page";

export default function CommonDirectory() {
  const { sortBy, showOpenDirectory } = getPreferenceValues<Preferences>();
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
  const { directoryInfo, isDetailLoading } = getDirectoryInfo(directoryPath, updateDetail);

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
        }
      }}
    >
      <ListEmptyView setRefresh={setRefresh} />

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
                  directoryInfo={directoryInfo}
                  isDetailLoading={isDetailLoading}
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
                  directoryInfo={directoryInfo}
                  isDetailLoading={isDetailLoading}
                  showDetail={showDetail}
                  setRefresh={setRefresh}
                  setRefreshDetail={setRefreshDetail}
                  setUpdateDetail={setUpdateDetail}
                />
              );
          })}
      </List.Section>
    </List>
  );
}

function SendToDirectoryItem(props: {
  directory: DirectoryInfo;
  index: number;
  commonDirectory: DirectoryInfo[];
  directoryInfo: FileContentInfo;
  isDetailLoading: boolean;
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
    directoryInfo,
    isDetailLoading,
  } = props;
  const primaryAction = getPreferenceValues<Preferences>().primaryAction as ActionType;
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
      detail={
        <List.Item.Detail
          isLoading={isDetailLoading}
          markdown={directoryInfo.fileContent}
          metadata={!isDetailLoading && <DirectoryDetailMetadata directoryInfo={directoryInfo} />}
        />
      }
      actions={
        <ActionPanel>
          <Action
            title={primaryAction === ActionType.COPY ? "Copy to Directory" : "Move to Directory"}
            icon={primaryAction === ActionType.COPY ? Icon.Clipboard : Icon.Download}
            onAction={async () => {
              await actionMoveOrCopy(directory, commonDirectory, index, primaryAction, false, setRefresh);
              setUpdateDetail(refreshNumber());
            }}
          />
          <Action
            title={primaryAction === ActionType.COPY ? "Move to Directory" : "Copy to Directory"}
            icon={primaryAction === ActionType.COPY ? Icon.Download : Icon.Clipboard}
            onAction={async () => {
              if (primaryAction === ActionType.COPY) {
                await actionMoveOrCopy(directory, commonDirectory, index, ActionType.MOVE, false, setRefresh);
              } else {
                await actionMoveOrCopy(directory, commonDirectory, index, ActionType.COPY, false, setRefresh);
              }
              setUpdateDetail(refreshNumber());
            }}
          />

          <Action.Push
            icon={Icon.ChevronDown}
            title={"Enter Folder"}
            shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
            target={<FolderPage folderPath={directory.path} isOpenDirectory={false} />}
          />

          <ActionPanel.Section>
            <Action
              title={
                primaryAction === ActionType.COPY ? "Copy to Folder Chosen Manually" : "Move to Folder Chosen Manually"
              }
              icon={primaryAction === ActionType.COPY ? Icon.Clipboard : Icon.Download}
              shortcut={{ modifiers: ["shift", "ctrl"], key: primaryAction === ActionType.COPY ? "c" : "m" }}
              onAction={async () => {
                await actionMoveOrCopy(directory, commonDirectory, index, primaryAction, true, setRefresh);
                setUpdateDetail(refreshNumber());
              }}
            />
            <Action
              title={
                primaryAction === ActionType.COPY ? "Move to Folder Chosen Manually" : "Copy to Folder Chosen Manually"
              }
              icon={primaryAction === ActionType.COPY ? Icon.Download : Icon.Clipboard}
              shortcut={{ modifiers: ["shift", "ctrl"], key: primaryAction === ActionType.COPY ? "m" : "c" }}
              onAction={async () => {
                if (primaryAction === ActionType.COPY) {
                  await actionMoveOrCopy(directory, commonDirectory, index, ActionType.MOVE, true, setRefresh);
                } else {
                  await actionMoveOrCopy(directory, commonDirectory, index, ActionType.COPY, true, setRefresh);
                }
                setUpdateDetail(refreshNumber());
              }}
            />
          </ActionPanel.Section>

          <ActionCopyFile name={directory.name} path={directory.path} />

          <ActionPanel.Section>
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
                    await alertDialog(
                      Icon.Trash,
                      "Remove directory",
                      `Are you sure you want to remove ${directory.name}?`,
                      "Remove",
                      async () => {
                        const _sendCommonDirectory = [...commonDirectory];
                        _sendCommonDirectory.splice(index, 1);
                        await LocalStorage.setItem(
                          LocalDirectoryKey.SEND_COMMON_DIRECTORY,
                          JSON.stringify(_sendCommonDirectory)
                        );
                        setRefresh(refreshNumber());

                        const _openCommonDirectory = await getDirectory(
                          LocalDirectoryKey.OPEN_COMMON_DIRECTORY,
                          "Rank"
                        );
                        const __openCommonDirectory = _openCommonDirectory.filter((value) => {
                          return value.path !== directory.path;
                        });
                        await LocalStorage.setItem(
                          LocalDirectoryKey.OPEN_COMMON_DIRECTORY,
                          JSON.stringify(__openCommonDirectory)
                        );
                        await showToast(Toast.Style.Success, "Successfully removed directory!");
                      }
                    );
                  }}
                />
                <Action
                  title={"Remove All Directory"}
                  icon={Icon.ExclamationMark}
                  shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                  onAction={async () => {
                    await alertDialog(
                      Icon.ExclamationMark,
                      "Remove all directories",
                      "Are you sure you want to remove all directories?",
                      "Remove All",
                      async () => {
                        await LocalStorage.setItem(LocalDirectoryKey.OPEN_COMMON_DIRECTORY, JSON.stringify([]));
                        await LocalStorage.setItem(LocalDirectoryKey.SEND_COMMON_DIRECTORY, JSON.stringify([]));
                        setRefresh(refreshNumber);
                        await showToast(Toast.Style.Success, "Successfully removed all directories!");
                      }
                    );
                  }}
                />
                <Action
                  title={"Reset All Ranks"}
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["ctrl", "shift"], key: "r" }}
                  onAction={async () => {
                    await alertDialog(
                      Icon.ArrowClockwise,
                      "Reset all ranks",
                      "Are you sure you want to reset all ranks?",
                      "Reset all ranks",
                      async () => {
                        resetRank(commonDirectory, setRefresh).then(async () => {
                          await showToast(Toast.Style.Success, "Successfully reset ranks!");
                        });
                      }
                    );
                  }}
                />
              </>
            )}
          </ActionPanel.Section>

          <ActionPanel.Section>
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

          <ActionOpenCommandPreferences />
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
  manual: boolean,
  setRefresh: React.Dispatch<React.SetStateAction<number>>
) {
  try {
    await showToast(Toast.Style.Animated, `${action == ActionType.COPY ? "Copying" : "Moving"}... Don't quit.`);
    let _commonDirectory = [...commonDirectory];
    const pathValid = fse.pathExistsSync(directory.path);
    if (pathValid) {
      let isSent: boolean;
      if (manual) {
        isSent = await getItemAndSend(action);
      } else {
        isSent = await getItemAndSend(action, directory.path);
      }
      _commonDirectory[index].valid = true;
      if (isSent && getPreferenceValues<Preferences>().sortBy === SortBy.Rank) {
        _commonDirectory = await upRankSendFile(_commonDirectory, index);
      }
    } else {
      await showToast(Toast.Style.Failure, "Error!", "Path has expired.");
      _commonDirectory[index].valid = false;
    }
    if (directory.isCommon) {
      await LocalStorage.setItem(LocalDirectoryKey.SEND_COMMON_DIRECTORY, JSON.stringify(_commonDirectory));
      setRefresh(refreshNumber());
    }
  } catch (e) {
    await showToast(Toast.Style.Failure, "Error!", "Path has expired." + String(e));
  }
}

async function upRankSendFile(directories: DirectoryInfo[], index: number) {
  const moreHighRank = directories.filter((value) => {
    return value.path !== directories[index].path && value.rankSendFile >= directories[index].rankSendFile;
  });
  if (moreHighRank.length !== 0) {
    let allRank = 0;
    directories.forEach((value) => [(allRank = allRank + value.rankSendFile)]);
    directories[index].rankSendFile =
      Math.floor((directories[index].rankSendFile + 1 - directories[index].rankSendFile / allRank) * 100) / 100;
  }
  directories.sort(function (a, b) {
    return b.rankSendFile - a.rankSendFile;
  });
  return directories;
}
