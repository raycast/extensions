import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Icon,
  List,
  LocalStorage,
  showToast,
  Toast,
  trash,
} from "@raycast/api";
import React, { useState } from "react";
import { getLocalStorage, isEmpty, isImage } from "./utils/common-utils";
import { DirectoryInfo, FileInfo, FileType } from "./types/types";
import { parse } from "path";
import { pinDirectory } from "./pin-directory";
import { LocalStorageKey, tagDirectoryTypes } from "./utils/constants";
import {
  alertDialog,
  copyLatestFile,
  getFileInfoAndPreview,
  getIsShowDetail,
  localDirectoryWithFiles,
  refreshNumber,
} from "./hooks/hooks";
import { ActionRemoveAllDirectories, PrimaryActionOnFile } from "./components/ui-components";
import { Preferences } from "./types/preferences";
import { ActionOpenCommandPreferences } from "./components/action-open-command-preferences";
import { QuickAccessEmptyView } from "./components/quick-access-empty-view";

export default function Command() {
  const { primaryAction, rememberTag, autoCopyLatestFile } = getPreferenceValues<Preferences>();
  const [tag, setTag] = useState<string>("All");
  const [refresh, setRefresh] = useState<number>(0);
  const [filePath, setFilePath] = useState<FileInfo>({
    id: "",
    name: "",
    path: "",
    type: FileType.FILE,
    modifyTime: 0,
  });
  const [refreshDetail, setRefreshDetail] = useState<number>(0);

  const showDetail = getIsShowDetail(refreshDetail);
  const { directoryWithFiles, allFilesNumber, loading } = localDirectoryWithFiles(refresh);
  const { fileContentInfo, isDetailLoading } = getFileInfoAndPreview(filePath);

  //preference: copy the latest file
  copyLatestFile(autoCopyLatestFile, directoryWithFiles);

  return (
    <List
      isLoading={loading}
      isShowingDetail={showDetail && allFilesNumber !== 0}
      searchBarPlaceholder={"Search files"}
      onSelectionChange={(id) => {
        if (typeof id === "string") {
          setFilePath(JSON.parse(id));
        }
      }}
      searchBarAccessory={
        directoryWithFiles.length !== 0 ? (
          <List.Dropdown onChange={setTag} tooltip={"Directory type"} storeValue={rememberTag}>
            <List.Dropdown.Item key={"All"} title={"All"} value={"All"} />
            <List.Dropdown.Section title={"Location"}>
              {directoryWithFiles.map((value, index) => {
                return (
                  <List.Dropdown.Item
                    key={index + value.directory.name}
                    title={value.directory.name}
                    value={value.directory.name}
                  />
                );
              })}
            </List.Dropdown.Section>
            <List.Dropdown.Section title={"Type"}>
              {tagDirectoryTypes.map((directoryType, index) => {
                return <List.Dropdown.Item key={index + directoryType} title={directoryType} value={directoryType} />;
              })}
            </List.Dropdown.Section>
          </List.Dropdown>
        ) : null
      }
    >
      <QuickAccessEmptyView
        title={directoryWithFiles.length === 0 ? "No directory. Please pin first" : "No files"}
        description={directoryWithFiles.length === 0 ? "You can pin directory from the Action Panel" : ""}
        setRefresh={setRefresh}
        directoryWithFiles={directoryWithFiles}
      />
      {directoryWithFiles.map(
        (directory, directoryIndex) =>
          (tag == directory.directory.name || tag == "All" || tagDirectoryTypes.includes(tag)) && (
            <List.Section
              key={directory.directory.id}
              title={directory.directory.name}
              subtitle={directory.files.length + (showDetail ? "" : "    " + parse(directory.directory.path).dir)}
            >
              {directory.files.map(
                (fileValue) =>
                  (tag === fileValue.type || !tagDirectoryTypes.includes(tag)) && (
                    <List.Item
                      id={JSON.stringify(fileValue)}
                      key={fileValue.path}
                      icon={
                        isImage(parse(fileValue.path).ext) ? { source: fileValue.path } : { fileIcon: fileValue.path }
                      }
                      title={fileValue.name}
                      detail={
                        <List.Item.Detail
                          isLoading={isDetailLoading}
                          markdown={fileContentInfo.fileContent}
                          metadata={
                            !isDetailLoading && (
                              <List.Item.Detail.Metadata>
                                <List.Item.Detail.Metadata.Label title="Name" text={fileContentInfo.name} />
                                <List.Item.Detail.Metadata.Separator />
                                <List.Item.Detail.Metadata.Label title="Where" text={fileContentInfo.where} />
                                <List.Item.Detail.Metadata.Separator />
                                <List.Item.Detail.Metadata.Label
                                  title={fileContentInfo.sizeTitle}
                                  text={fileContentInfo.size}
                                />
                                <List.Item.Detail.Metadata.Separator />
                                <List.Item.Detail.Metadata.Label title="Created" text={fileContentInfo.created} />
                                <List.Item.Detail.Metadata.Separator />
                                <List.Item.Detail.Metadata.Label title="Modified" text={fileContentInfo.modified} />
                                <List.Item.Detail.Metadata.Separator />
                                <List.Item.Detail.Metadata.Label
                                  title="Last opened"
                                  text={fileContentInfo.lastOpened}
                                />
                              </List.Item.Detail.Metadata>
                            )
                          }
                        />
                      }
                      actions={
                        <ActionPanel>
                          <ActionsOnFile
                            primaryAction={primaryAction}
                            fileInfo={fileValue}
                            index={directoryIndex}
                            setRefresh={setRefresh}
                          />
                          <ActionPanel.Section>
                            <Action
                              icon={Icon.Pin}
                              title={`Pin Directory`}
                              shortcut={{ modifiers: ["cmd"], key: "d" }}
                              onAction={async () => {
                                await pinDirectory(false);
                                setRefresh(refreshNumber());
                              }}
                            />
                            <Action
                              icon={Icon.Trash}
                              title={`Remove Directory`}
                              shortcut={{ modifiers: ["cmd", "ctrl"], key: "x" }}
                              onAction={async () => {
                                await alertDialog(
                                  Icon.XmarkCircle,
                                  "Remove Directory",
                                  `Are you sure you want to remove the ${directory.directory.name} directory?`,
                                  "Remove",
                                  async () => {
                                    const localstorage = await getLocalStorage(LocalStorageKey.LOCAL_PIN_DIRECTORY);
                                    const _localDirectory = isEmpty(localstorage) ? [] : JSON.parse(localstorage);
                                    _localDirectory.splice(directoryIndex, 1);
                                    await LocalStorage.setItem(
                                      LocalStorageKey.LOCAL_PIN_DIRECTORY,
                                      JSON.stringify(_localDirectory)
                                    );
                                    setRefresh(refreshNumber());
                                    await showToast(
                                      Toast.Style.Success,
                                      "Success!",
                                      `${directory.directory.name} directory is removed.`
                                    );
                                  }
                                );
                              }}
                            />
                            <ActionRemoveAllDirectories setRefresh={setRefresh} />
                            <Action
                              icon={Icon.TwoArrowsClockwise}
                              title={`Reset Directory Rank`}
                              shortcut={{ modifiers: ["ctrl", "shift"], key: "r" }}
                              onAction={async () => {
                                await alertDialog(
                                  Icon.ExclamationMark,
                                  "Reset All Rank",
                                  "Are you sure you want to reset the ranking of all directories??",
                                  "Reset All",
                                  async () => {
                                    const localstorage = await getLocalStorage(LocalStorageKey.LOCAL_PIN_DIRECTORY);
                                    const _localDirectory: DirectoryInfo[] = isEmpty(localstorage)
                                      ? []
                                      : JSON.parse(localstorage);

                                    const _pinnedDirectory = _localDirectory.map((value) => {
                                      value.rank = 1;
                                      return value;
                                    });
                                    await LocalStorage.setItem(
                                      LocalStorageKey.LOCAL_PIN_DIRECTORY,
                                      JSON.stringify(_pinnedDirectory)
                                    );
                                    setRefresh(refreshNumber());
                                    await showToast(Toast.Style.Success, "Success!", `All ranks are reset.`);
                                  }
                                );
                              }}
                            />
                          </ActionPanel.Section>

                          <ActionPanel.Section>
                            <Action
                              title={"Toggle Details"}
                              icon={Icon.Sidebar}
                              shortcut={{ modifiers: ["shift", "ctrl"], key: "d" }}
                              onAction={async () => {
                                await LocalStorage.setItem("isShowDetail", !showDetail);
                                setRefreshDetail(refreshNumber());
                              }}
                            />
                          </ActionPanel.Section>

                          <ActionOpenCommandPreferences />
                        </ActionPanel>
                      }
                    />
                  )
              )}
            </List.Section>
          )
      )}
    </List>
  );
}

function ActionsOnFile(props: {
  primaryAction: string;
  fileInfo: FileInfo;
  index: number;
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { primaryAction, fileInfo, index, setRefresh } = props;
  return (
    <>
      <PrimaryActionOnFile primaryAction={primaryAction} fileInfo={fileInfo} index={index} setRefresh={setRefresh} />

      <ActionPanel.Section>
        <Action.OpenWith shortcut={{ modifiers: ["cmd"], key: "o" }} path={fileInfo.path} />
        <Action.ShowInFinder
          shortcut={{ modifiers: ["cmd"], key: "s" }}
          path={fileInfo.path}
          onShow={async () => await upRank(index, setRefresh)}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action.CopyToClipboard
          title={"Copy Name"}
          content={fileInfo.name}
          shortcut={{ modifiers: ["shift", "cmd"], key: "." }}
        />
        <Action.CopyToClipboard
          title={"Copy Path"}
          content={fileInfo.path}
          shortcut={{ modifiers: ["shift", "cmd"], key: "," }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          icon={Icon.Trash}
          title={"Move to trash"}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={async () => {
            await alertDialog(
              Icon.Trash,
              "Move to Trash",
              `Are you sure you want to move ${fileInfo.name} to the trash?`,
              "Move to trash",
              async () => {
                await trash(fileInfo.path);
                setRefresh(refreshNumber);
                await showToast(Toast.Style.Success, "Success!", `${fileInfo.name} is moved to the trash.`);
              }
            );
          }}
        />
      </ActionPanel.Section>
    </>
  );
}

export async function upRank(index: number, setRefresh: React.Dispatch<React.SetStateAction<number>>) {
  const _localstorage = await getLocalStorage(LocalStorageKey.LOCAL_PIN_DIRECTORY);
  const directories: DirectoryInfo[] = isEmpty(_localstorage) ? [] : JSON.parse(_localstorage);
  const moreHighRank = directories.filter((value) => {
    return value.path !== directories[index].path && value.rank >= directories[index].rank;
  });
  if (moreHighRank.length !== 0) {
    let allRank = 0;
    directories.forEach((value) => [(allRank = allRank + value.rank)]);
    directories[index].rank = Math.floor((directories[index].rank + 1 - directories[index].rank / allRank) * 100) / 100;
  }
  directories.sort(function (a, b) {
    return b.rank - a.rank;
  });

  await LocalStorage.setItem(LocalStorageKey.LOCAL_PIN_DIRECTORY, JSON.stringify(directories));
  setRefresh(refreshNumber());
}
