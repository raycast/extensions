import { Action, ActionPanel, Icon, List, LocalStorage, showToast, Toast, useNavigation } from "@raycast/api";
import { DirectoryInfo, LocalDirectoryKey, SortBy } from "./utils/directory-info";
import React, { useEffect, useState } from "react";
import { getChooseFolder, getOpenFinderWindowPath, isEmpty, preferences } from "./utils/utils";
import { homedir } from "os";
import { ActionType, getItemAndSend } from "./utils/send-file-utils";
import { getDirectory, resetRank } from "./open-common-directory";
import fse from "fs-extra";
import AddCommonDirectory from "./add-common-directory";
import { DetailKey, getDirectoryContent, getShowDetailLocalStorage, setShowDetailLocalStorage } from "./utils/ui-utils";

export default function CommonDirectory() {
  const [searchValue, setSearchValue] = useState<string>("");
  const [commonDirectory, setCommonDirectory] = useState<DirectoryInfo[]>([]);
  const [openDirectory, setOpenDirectory] = useState<DirectoryInfo[]>([]);
  const [detailDirectoryPath, setDetailDirectoryPath] = useState<string>("");
  const [directoryContent, setDirectoryContent] = useState<string>("");

  const [showDetail, setShowDetail] = useState<boolean>(false);
  const [updateDetail, setUpdateDetail] = useState<number[]>([0]);
  const [updateList, setUpdateList] = useState<number[]>([0]);
  const [loading, setLoading] = useState<boolean>(true);
  const { sortBy, showOpenDirectory } = preferences();
  const homeDirectory = homedir();
  const { push } = useNavigation();

  useEffect(() => {
    async function _fetchLocalStorage() {
      setShowDetail(await getShowDetailLocalStorage(DetailKey.SEND_COMMON_DIRECTORY));
      setCommonDirectory(await getDirectory(LocalDirectoryKey.SEND_COMMON_DIRECTORY, sortBy));
      if (showOpenDirectory) setOpenDirectory(await getOpenFinderWindowPath());
      setLoading(false);
    }

    _fetchLocalStorage().then();
  }, [updateList]);

  useEffect(() => {
    async function _fetchDetailContent() {
      setDirectoryContent(getDirectoryContent(detailDirectoryPath));
    }

    _fetchDetailContent().then();
  }, [detailDirectoryPath, updateDetail]);

  return (
    <List
      isLoading={loading}
      isShowingDetail={showDetail}
      searchBarPlaceholder={"Send files to"}
      onSearchTextChange={(newValue) => {
        setSearchValue(newValue);
      }}
      onSelectionChange={(id) => {
        if (typeof id === "string") {
          const idContent = JSON.parse(id);
          setDetailDirectoryPath(idContent.path);
        } else {
          setDetailDirectoryPath("");
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
                  <SendToDirectoryItem
                    key={directory.id}
                    homeDirectory={homeDirectory}
                    directory={directory}
                    index={index}
                    commonDirectory={commonDirectory}
                    directoryContent={directoryContent}
                    setCommonDirectory={setCommonDirectory}
                    updateListUseState={[updateList, setUpdateList]}
                    updateDetailUseState={[updateDetail, setUpdateDetail]}
                    showDetailUseState={[showDetail, setShowDetail]}
                  />
                );
            })}
          </List.Section>
          <List.Section title={"Open Directory"}>
            {openDirectory.map((directory, index) => {
              if (directory.name.toLowerCase().includes(searchValue.toLowerCase()))
                return (
                  <SendToDirectoryItem
                    key={directory.id}
                    homeDirectory={homeDirectory}
                    directory={directory}
                    index={index}
                    commonDirectory={openDirectory}
                    directoryContent={directoryContent}
                    setCommonDirectory={setCommonDirectory}
                    updateListUseState={[updateList, setUpdateList]}
                    updateDetailUseState={[updateDetail, setUpdateDetail]}
                    showDetailUseState={[showDetail, setShowDetail]}
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
  homeDirectory: string;
  directory: DirectoryInfo;
  index: number;
  commonDirectory: DirectoryInfo[];
  directoryContent: string;
  setCommonDirectory: React.Dispatch<React.SetStateAction<DirectoryInfo[]>>;
  updateListUseState: [number[], React.Dispatch<React.SetStateAction<number[]>>];
  updateDetailUseState: [number[], React.Dispatch<React.SetStateAction<number[]>>];
  showDetailUseState: [boolean, React.Dispatch<React.SetStateAction<boolean>>];
}) {
  const { homeDirectory, directory, setCommonDirectory, index, commonDirectory, directoryContent } = props;
  const [updateList, setUpdateList] = props.updateListUseState;
  const [updateDetail, setUpdateDetail] = props.updateDetailUseState;
  const [showDetail, setShowDetail] = props.showDetailUseState;
  const { primaryAction } = preferences();
  const { push } = useNavigation();
  return (
    <List.Item
      id={JSON.stringify({ type: directory.isCommon, path: directory.path })}
      icon={{ fileIcon: directory.path }}
      title={directory.name}
      subtitle={showDetail ? "" : directory.alias}
      accessories={
        showDetail
          ? [{ text: isEmpty(directory.alias) ? " " : directory.alias }]
          : [{ text: "~" + directory.path.substring(homeDirectory.length) }, directory.valid ? {} : { icon: "⚠️" }]
      }
      detail={<List.Item.Detail markdown={directoryContent} />}
      actions={
        <ActionPanel>
          <Action
            title={primaryAction === ActionType.COPY ? "Copy File to Directory" : "Move File to Directory"}
            icon={primaryAction === ActionType.COPY ? Icon.Clipboard : Icon.Download}
            onAction={async () => {
              await actionMoveOrCopy(directory, commonDirectory, index, setCommonDirectory, primaryAction, false);

              const _updateDetail = [...updateDetail];
              _updateDetail[0]++;
              setUpdateDetail(_updateDetail);
            }}
          />
          <Action
            title={primaryAction === ActionType.COPY ? "Move File to Directory" : "Copy File to Directory"}
            icon={primaryAction === ActionType.COPY ? Icon.Download : Icon.Clipboard}
            onAction={async () => {
              if (primaryAction === ActionType.COPY) {
                await actionMoveOrCopy(directory, commonDirectory, index, setCommonDirectory, ActionType.MOVE, false);
              } else {
                await actionMoveOrCopy(directory, commonDirectory, index, setCommonDirectory, ActionType.COPY, false);
              }
              const _updateDetail = [...updateDetail];
              _updateDetail[0]++;
              setUpdateDetail(_updateDetail);
            }}
          />
          <ActionPanel.Section title={"Advanced Action"}>
            <Action
              title={
                primaryAction === ActionType.COPY ? "Copy to Folder Chosen Manually" : "Move to Folder Chosen Manually"
              }
              icon={primaryAction === ActionType.COPY ? Icon.Clipboard : Icon.Download}
              shortcut={{ modifiers: ["ctrl"], key: "m" }}
              onAction={async () => {
                await actionMoveOrCopy(directory, commonDirectory, index, setCommonDirectory, primaryAction, true);

                const _updateDetail = [...updateDetail];
                _updateDetail[0]++;
                setUpdateDetail(_updateDetail);
              }}
            />
            <Action
              title={
                primaryAction === ActionType.COPY ? "Move to Folder Chosen Manually" : "Copy to Folder Chosen Manually"
              }
              icon={primaryAction === ActionType.COPY ? Icon.Download : Icon.Clipboard}
              shortcut={{ modifiers: ["ctrl"], key: "c" }}
              onAction={async () => {
                if (primaryAction === ActionType.COPY) {
                  await actionMoveOrCopy(directory, commonDirectory, index, setCommonDirectory, ActionType.MOVE, true);
                } else {
                  await actionMoveOrCopy(directory, commonDirectory, index, setCommonDirectory, ActionType.COPY, true);
                }
                const _updateDetail = [...updateDetail];
                _updateDetail[0]++;
                setUpdateDetail(_updateDetail);
              }}
            />
          </ActionPanel.Section>

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
              <Action
                title={"Remove Directory"}
                icon={Icon.Trash}
                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                onAction={async () => {
                  const _sendCommonDirectory = [...commonDirectory];
                  _sendCommonDirectory.splice(index, 1);
                  setCommonDirectory(_sendCommonDirectory);
                  await LocalStorage.setItem(
                    LocalDirectoryKey.SEND_COMMON_DIRECTORY,
                    JSON.stringify(_sendCommonDirectory)
                  );

                  const _openCommonDirectory = await getDirectory(LocalDirectoryKey.OPEN_COMMON_DIRECTORY, "Rank");
                  const __openCommonDirectory = _openCommonDirectory.filter((value) => {
                    return value.path !== directory.path;
                  });
                  await LocalStorage.setItem(
                    LocalDirectoryKey.OPEN_COMMON_DIRECTORY,
                    JSON.stringify(__openCommonDirectory)
                  );
                  await showToast(Toast.Style.Success, "Remove success!");
                }}
              />
            )}
            <Action
              title={"Rest All Rank"}
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["shift", "cmd"], key: "r" }}
              onAction={() => {
                resetRank(commonDirectory, setCommonDirectory).then(async () => {
                  await showToast(Toast.Style.Success, "Reset success!");
                });
              }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title={"Detail Action"}>
            <Action
              title={"Toggle Details"}
              icon={Icon.Sidebar}
              shortcut={{ modifiers: ["shift", "cmd"], key: "d" }}
              onAction={() => {
                setShowDetail(!showDetail);
                setShowDetailLocalStorage(DetailKey.SEND_COMMON_DIRECTORY, !showDetail).then();
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
  setCommonDirectory: React.Dispatch<React.SetStateAction<DirectoryInfo[]>>,
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
      if (isMoved && preferences().sortBy === SortBy.Rank) {
        _commonDirectory = await upRankSendFile(_commonDirectory, index);
      }
    } else {
      await showToast(Toast.Style.Failure, "Error!", "Path has expired.");
      _commonDirectory[index].valid = false;
    }
    if (directory.isCommon) {
      setCommonDirectory(_commonDirectory);
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
