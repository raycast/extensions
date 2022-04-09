import { Action, ActionPanel, Icon, List, LocalStorage, showToast, Toast, useNavigation } from "@raycast/api";
import { DirectoryInfo, LocalDirectoryKey } from "./utils/directory-info";
import React, { useEffect, useState } from "react";
import { getChooseFolder, getOpenFinderWindowPath, preferences } from "./utils/utils";
import { homedir } from "os";
import { ActionType } from "./utils/send-file-utils";
import { getDirectory, resetRank } from "./open-common-directory";
import fs from "fs-extra";
import { getItemAndSend } from "./utils/send-file-utils";
import AddCommonDirectory from "./add-common-directory";

export default function CommonDirectory() {
  const [searchValue, setSearchValue] = useState<string>("");
  const [commonDirectory, setCommonDirectory] = useState<DirectoryInfo[]>([]);
  const [openDirectory, setOpenDirectory] = useState<DirectoryInfo[]>([]);
  const [updateList, setUpdateList] = useState<number[]>([0]);
  const [loading, setLoading] = useState<boolean>(true);
  const { sortBy, showOpenDirectory } = preferences();
  const homeDirectory = homedir();
  const { push } = useNavigation();

  useEffect(() => {
    async function _fetchLocalStorage() {
      setCommonDirectory(await getDirectory(LocalDirectoryKey.SEND_COMMON_DIRECTORY, sortBy));
      if (showOpenDirectory) setOpenDirectory(await getOpenFinderWindowPath());
      setLoading(false);
    }

    _fetchLocalStorage().then();
  }, [updateList]);

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder={"Send files to"}
      onSearchTextChange={(newValue) => {
        setSearchValue(newValue);
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
                  <SendToDirectoryItem
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

function SendToDirectoryItem(props: {
  homeDirectory: string;
  directory: DirectoryInfo;
  setCommonDirectory: React.Dispatch<React.SetStateAction<DirectoryInfo[]>>;
  index: number;
  commonDirectory: DirectoryInfo[];
  updateListUseState: [number[], React.Dispatch<React.SetStateAction<number[]>>];
}) {
  const { homeDirectory, directory, setCommonDirectory, index, commonDirectory } = props;
  const [updateList, setUpdateList] = props.updateListUseState;
  const { primaryAction } = preferences();
  const { push } = useNavigation();
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
            title={primaryAction === ActionType.COPY ? "Copy File to Directory" : "Move File to Directory"}
            icon={primaryAction === ActionType.COPY ? Icon.Clipboard : Icon.Download}
            onAction={async () => {
              await showToast(
                Toast.Style.Animated,
                `${primaryAction == ActionType.COPY ? "Copying" : "Moving"}... Don't quit.`
              );
              if (primaryAction === ActionType.COPY) {
                await actionByDefault(directory, commonDirectory, index, setCommonDirectory, ActionType.COPY);
              } else {
                await actionByDefault(directory, commonDirectory, index, setCommonDirectory, ActionType.MOVE);
              }
            }}
          />
          <Action
            title={primaryAction === ActionType.COPY ? "Move File to Directory" : "Copy File to Directory"}
            icon={primaryAction === ActionType.COPY ? Icon.Download : Icon.Clipboard}
            onAction={async () => {
              await showToast(
                Toast.Style.Animated,
                `${primaryAction == ActionType.COPY ? "Moving" : "Copying"}... Don't quit.`
              );
              if (primaryAction === ActionType.COPY) {
                await actionByDefault(directory, commonDirectory, index, setCommonDirectory, ActionType.MOVE);
              } else {
                await actionByDefault(directory, commonDirectory, index, setCommonDirectory, ActionType.COPY);
              }
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
                await showToast(
                  Toast.Style.Animated,
                  `${primaryAction == ActionType.COPY ? "Copying" : "Moving"}... Don't quit.`
                );
                if (primaryAction === ActionType.COPY) {
                  await actionByChooseFolder(ActionType.COPY);
                } else {
                  await actionByChooseFolder(ActionType.MOVE);
                }
              }}
            />
            <Action
              title={
                primaryAction === ActionType.COPY ? "Move to Folder Chosen Manually" : "Copy to Folder Chosen Manually"
              }
              icon={primaryAction === ActionType.COPY ? Icon.Download : Icon.Clipboard}
              shortcut={{ modifiers: ["ctrl"], key: "c" }}
              onAction={async () => {
                await showToast(
                  Toast.Style.Animated,
                  `${primaryAction == ActionType.COPY ? "Moving" : "Copying"}... Don't quit.`
                );
                if (primaryAction === ActionType.COPY) {
                  await actionByChooseFolder(ActionType.MOVE);
                } else {
                  await actionByChooseFolder(ActionType.COPY);
                }
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
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => {
                resetRank(commonDirectory, setCommonDirectory).then(async () => {
                  await showToast(Toast.Style.Success, "Reset success!");
                });
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

async function actionByDefault(
  directory: DirectoryInfo,
  commonDirectory: DirectoryInfo[],
  index: number,
  setCommonDirectory: React.Dispatch<React.SetStateAction<DirectoryInfo[]>>,
  action: ActionType
) {
  try {
    if (directory.isCommon) {
      let _commonDirectory = [...commonDirectory];
      const pathValid = fs.pathExistsSync(directory.path);
      if (pathValid) {
        const isMoved = await getItemAndSend(directory.path, action);
        _commonDirectory[index].valid = true;
        if (isMoved) {
          _commonDirectory = await upRankSendFile([..._commonDirectory], index);
        }
      } else {
        await showToast(Toast.Style.Failure, "Path has expired.");
        _commonDirectory[index].valid = false;
      }
      setCommonDirectory(_commonDirectory);
      await LocalStorage.setItem(LocalDirectoryKey.SEND_COMMON_DIRECTORY, JSON.stringify(_commonDirectory));
    } else {
      await getItemAndSend(directory.path, action);
    }
  } catch (e) {
    await showToast(Toast.Style.Failure, "Path has expired." + String(e));
  }
}

async function actionByChooseFolder(action: ActionType) {
  const destPath = await getChooseFolder();
  await getItemAndSend(destPath, action);
}

async function upRankSendFile(directory: DirectoryInfo[], index: number) {
  let allRank = 0;
  directory.forEach((value) => [(allRank = allRank + value.rankSendFile)]);
  directory[index].rankSendFile =
    Math.floor((directory[index].rankSendFile + 1 - directory[index].rankSendFile / allRank) * 100) / 100;
  directory.sort(function (a, b) {
    return b.rankSendFile - a.rankSendFile;
  });
  return directory;
}
