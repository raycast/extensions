import { Action, ActionPanel, Icon, List, LocalStorage, open, showHUD, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { runAppleScript } from "run-applescript";
import {
  checkDirectoryValid,
  copyFileByPath,
  getLocalStorage,
  isEmpty,
  isImage,
  preferences,
} from "./utils/common-utils";
import { DirectoryInfo, DirectoryType, LocalStorageKey } from "./utils/directory-info";
import { parse } from "path";
import { putFileOnShelf } from "./put-file-on-shelf";

export default function Command() {
  const [localDirectory, setLocalDirectory] = useState<DirectoryInfo[]>([]);
  const [checkStart, setCheckStart] = useState<number[]>([0]);
  const [refreshList, setRefreshList] = useState<number[]>([0]);
  const [loading, setLoading] = useState<boolean>(true);
  const { copyAndClose, folderFirst } = preferences();

  useEffect(() => {
    async function _initRunAppleScript() {
      const _localstorage = await getLocalStorage(LocalStorageKey.LOCAL_DIRECTORY);
      let localDirectory: DirectoryInfo[] = [];
      if (!isEmpty(_localstorage)) {
        localDirectory = JSON.parse(_localstorage) as DirectoryInfo[];
      }
      const localDirectoryReverse = localDirectory;
      const localFolder = localDirectoryReverse.filter((value) => value.type === DirectoryType.DIRECTORY);
      const localFile = localDirectoryReverse.filter((value) => value.type === DirectoryType.FILE);
      setLocalDirectory(folderFirst ? [...localFile, ...localFolder] : [...localFolder, ...localFile]);
      const _checkStart = [...checkStart];
      _checkStart[0] = _checkStart[0]++;
      setCheckStart(_checkStart);
      setLoading(false);
      await runAppleScript("");
    }

    _initRunAppleScript().then();
  }, [refreshList]);

  useEffect(() => {
    async function _checkDirectoryValid() {
      const _validDirectory = checkDirectoryValid(localDirectory);
      setLocalDirectory(_validDirectory);
      await LocalStorage.setItem(LocalStorageKey.LOCAL_DIRECTORY, JSON.stringify(_validDirectory));
    }

    _checkDirectoryValid().then();
  }, [checkStart]);

  return (
    <List isLoading={loading} searchBarPlaceholder="Search by name...">
      {localDirectory.length === 0 ? (
        <List.EmptyView
          title={"No files. Please add first"}
          description={"You can always add files from the Action Panel"}
          actions={
            <ActionPanel>
              <Action
                title={"Add File"}
                icon={Icon.Download}
                onAction={async () => {
                  await putFileOnShelf(true);
                  const _refreshList = [...refreshList];
                  _refreshList[0] = _refreshList[0]++;
                  setRefreshList(_refreshList);
                }}
              />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {localDirectory.reverse().map((value, index) => (
            <List.Item
              key={value.id}
              icon={isImage(parse(value.path).ext) ? { source: value.path } : { fileIcon: value.path }}
              title={value.name}
              accessories={[{ text: parse(value.path).dir }, value.valid ? {} : { icon: "⚠️" }]}
              actions={
                <ActionPanel>
                  <Action
                    icon={Icon.Clipboard}
                    title={"Copy to Clipboard"}
                    onAction={async () => {
                      const copyResult = await copyFileByPath(value.path);
                      if (isEmpty(copyResult)) {
                        copyAndClose
                          ? await showHUD("Copy file success")
                          : await showToast(Toast.Style.Success, "Success!", "File is copied to the clipboard.");
                      } else {
                        copyAndClose
                          ? await showHUD(copyResult)
                          : await showToast(Toast.Style.Failure, "Error.", copyResult + ".");
                      }
                    }}
                  />
                  <Action
                    icon={Icon.Window}
                    title={value.type === DirectoryType.FILE ? "Open in Default App" : "Open in Finder"}
                    onAction={async () => {
                      try {
                        await open(value.path);
                        await showHUD("Open in Default App");
                      } catch (e) {
                        await showToast(Toast.Style.Failure, "Error.", "Path has expired.");
                      }
                    }}
                  />
                  <Action
                    icon={Icon.Finder}
                    title={"Reveal in Finder"}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={async () => {
                      await open(parse(value.path).dir);
                      try {
                        await open(parse(value.path).dir);
                        await showHUD("Reveal in Finder");
                      } catch (e) {
                        await showToast(Toast.Style.Failure, "Error.", "Path has expired.");
                      }
                    }}
                  />
                  <ActionPanel.Section title="File Actions">
                    <Action
                      icon={Icon.Plus}
                      title={`Add File`}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                      onAction={async () => {
                        await putFileOnShelf(true);
                        const _refreshList = [...refreshList];
                        _refreshList[0] = _refreshList[0]++;
                        setRefreshList(_refreshList);
                      }}
                    />
                    <Action
                      icon={Icon.Trash}
                      title={`Remove File`}
                      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                      onAction={async () => {
                        const _localDirectory = [...localDirectory];
                        _localDirectory.splice(index, 1);
                        setLocalDirectory(_localDirectory);
                        await LocalStorage.setItem(LocalStorageKey.LOCAL_DIRECTORY, JSON.stringify(_localDirectory));
                        await showToast(Toast.Style.Success, "Success!", `${value.name} has been removed.`);
                      }}
                    />
                    <Action
                      icon={Icon.ExclamationMark}
                      title={"Remove All Files"}
                      shortcut={{ modifiers: ["shift", "cmd"], key: "backspace" }}
                      onAction={async () => {
                        await LocalStorage.clear();
                        setLocalDirectory([]);
                        await showToast(Toast.Style.Success, "Success!", "All Files have been removed.");
                      }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </>
      )}
    </List>
  );
}
