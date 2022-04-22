import { Action, ActionPanel, Icon, List, LocalStorage, open, showHUD, showToast, Toast } from "@raycast/api";
import React, { useState } from "react";
import { commonPreferences, isEmpty, isImage } from "./utils/common-utils";
import { DirectoryInfo, DirectoryType, FileInfo } from "./utils/directory-info";
import { parse } from "path";
import { pinDirectory } from "./pin-directory";
import { LocalStorageKey } from "./utils/constants";
import { copyFileByPath } from "./utils/applescript-utils";
import { alertDialog, copyLatestFile, localDirectoryWithFiles, refreshNumber } from "./hooks/hooks";
import fse from "fs-extra";
import { ActionRemoveAllDirectories } from "./utils/ui-components";

export default function Command() {
  const [tag, setTag] = useState<string>("All");
  const [refresh, setRefresh] = useState<number>(0);
  const { autoCopyLatestFile } = commonPreferences();

  const { pinnedDirectory, directoryWithFiles, allFilesNumber, directoryTags, loading } =
    localDirectoryWithFiles(refresh);
  copyLatestFile(autoCopyLatestFile, directoryWithFiles);

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder={"Search file"}
      searchBarAccessory={
        <List.Dropdown onChange={setTag} tooltip={"Directory type"}>
          <List.Dropdown.Item key={"All"} title={"All Directory"} value={"All"} />
          {directoryTags.map((value, index) => {
            return <List.Dropdown.Item key={index + value} title={value} value={value} />;
          })}
        </List.Dropdown>
      }
    >
      {directoryWithFiles.length === 0 || allFilesNumber === 0 ? (
        <List.EmptyView
          title={directoryWithFiles.length === 0 ? "No directory. Please pin first" : "No Files."}
          description={"You can always pin directory from the Action Panel"}
          actions={
            <ActionPanel>
              <Action
                title={"Pin Directory"}
                icon={Icon.Download}
                onAction={async () => {
                  await pinDirectory(false);
                  setRefresh(refreshNumber());
                }}
              />
              {directoryWithFiles.length != 0 && <ActionRemoveAllDirectories setRefresh={setRefresh} />}
            </ActionPanel>
          }
        />
      ) : (
        <>
          {directoryWithFiles.map(
            (directory, directoryIndex) =>
              (tag == directory.directory.name || tag == "All") && (
                <List.Section
                  key={directory.directory.id}
                  title={directory.directory.name}
                  subtitle={parse(directory.directory.path).dir}
                >
                  {directory.files.map((value, index) => (
                    <List.Item
                      key={value.id}
                      icon={isImage(parse(value.path).ext) ? { source: value.path } : { fileIcon: value.path }}
                      title={value.name}
                      accessories={index === 0 ? [{ icon: "🌟" }] : []}
                      actions={
                        <ActionPanel>
                          <ActionsOnFile
                            fileInfo={value}
                            directories={pinnedDirectory}
                            index={directoryIndex}
                            setRefresh={setRefresh}
                          />
                          <ActionPanel.Section title="Directory Action">
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
                              shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                              onAction={async () => {
                                const _localDirectory = [...pinnedDirectory];
                                _localDirectory.splice(directoryIndex, 1);
                                await LocalStorage.setItem(
                                  LocalStorageKey.LOCAL_PIN_DIRECTORY,
                                  JSON.stringify(_localDirectory)
                                );
                                setRefresh(refreshNumber());
                                await showToast(
                                  Toast.Style.Success,
                                  "Success!",
                                  `${pinnedDirectory[directoryIndex].name} is removed.`
                                );
                              }}
                            />
                            <ActionRemoveAllDirectories setRefresh={setRefresh} />
                            <Action
                              icon={Icon.TwoArrowsClockwise}
                              title={`Reset Directory Rank`}
                              shortcut={{ modifiers: ["shift", "cmd"], key: "r" }}
                              onAction={async () => {
                                const _pinnedDirectory = pinnedDirectory.map((value) => {
                                  value.rank = 1;
                                  return value;
                                });
                                await LocalStorage.setItem(
                                  LocalStorageKey.LOCAL_PIN_DIRECTORY,
                                  JSON.stringify(_pinnedDirectory)
                                );
                                setRefresh(refreshNumber());
                                await showToast(
                                  Toast.Style.Success,
                                  "Success!",
                                  `${pinnedDirectory[directoryIndex].name} is removed.`
                                );
                              }}
                            />
                          </ActionPanel.Section>
                        </ActionPanel>
                      }
                    />
                  ))}
                </List.Section>
              )
          )}
        </>
      )}
    </List>
  );
}

function ActionsOnFile(props: {
  fileInfo: FileInfo;
  directories: DirectoryInfo[];
  index: number;
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { fileInfo, directories, index, setRefresh } = props;
  return (
    <>
      <Action
        icon={Icon.Clipboard}
        title={"Copy to Clipboard"}
        onAction={async () => {
          const copyResult = await copyFileByPath(fileInfo.path);
          if (isEmpty(copyResult)) {
            await showHUD(`${fileInfo.name} is copied to clipboard`);
          } else {
            await showHUD(copyResult);
          }
          await upRank(directories, index, setRefresh);
        }}
      />
      <Action
        icon={Icon.Window}
        title={fileInfo.type === DirectoryType.FILE ? "Open in Default App" : "Open in Finder"}
        onAction={async () => {
          try {
            await open(fileInfo.path);
            await showHUD("Open in Default App");
            await upRank(directories, index, setRefresh);
          } catch (e) {
            await showToast(Toast.Style.Failure, "Error.", String(e));
          }
        }}
      />
      <Action
        icon={Icon.Finder}
        title={"Reveal in Finder"}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={async () => {
          try {
            await open(parse(fileInfo.path).dir);
            await showHUD("Reveal in Finder");
            await upRank(directories, index, setRefresh);
          } catch (e) {
            await showToast(Toast.Style.Failure, "Error.", String(e));
          }
        }}
      />
      <Action
        icon={Icon.Trash}
        title={"Delete File Permanently"}
        shortcut={{ modifiers: ["ctrl"], key: "x" }}
        onAction={async () => {
          try {
            await alertDialog(
              "⚠️Warning",
              "Deleted files cannot be recovered. Do you want to Delete?",
              "Delete",
              async () => {
                fse.removeSync(fileInfo.path);
                setRefresh(refreshNumber());
                await showToast(Toast.Style.Success, "Success!", `${fileInfo.name} was deleted.`);
              },
              async () => {
                await showToast(Toast.Style.Failure, "Error!", `Operation is canceled.`);
              }
            );
          } catch (e) {
            await showToast(Toast.Style.Failure, "Error.", String(e));
          }
        }}
      />
    </>
  );
}

async function upRank(
  directories: DirectoryInfo[],
  index: number,
  setRefresh: React.Dispatch<React.SetStateAction<number>>
) {
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
  await LocalStorage.setItem(LocalStorageKey.LOCAL_PIN_DIRECTORY, JSON.stringify(directories));

  setRefresh(refreshNumber());
  return directories;
}
