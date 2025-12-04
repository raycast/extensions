import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  List,
  LocalStorage,
  open,
  showHUD,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import React, { useState } from "react";
import { isImage, timeStampToDateTime } from "./utils/common-utils";
import { parse } from "path";
import { DirectoryType, tagDirectoryPath, tagDirectoryType } from "./utils/directory-info";
import { showHiddenFiles } from "./utils/hide-files-utils";
import { LocalStorageKey } from "./utils/constants";
import { alertDialog, getHiddenFiles, refreshNumber } from "./hooks/hooks";
import { ListEmptyView } from "./components/list-empty-view";
import { rememberTag } from "./types/preferences";
import { ActionOpenCommandPreferences } from "./components/action-open-command-preferences";

export default function Command() {
  const [tag, setTag] = useState<string>("");
  const [refresh, setRefresh] = useState<number>(0);

  const { localHiddenDirectory, loading } = getHiddenFiles(refresh);

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search hidden files"
      searchBarAccessory={
        localHiddenDirectory.length !== 0 ? (
          <List.Dropdown onChange={setTag} tooltip={"Filter Tag"} storeValue={rememberTag}>
            <List.Dropdown.Item key={"All"} title={"All"} value={"All"} />
            {
              <List.Dropdown.Section title={"Type"}>
                {tagDirectoryType.map((value, index) => {
                  return <List.Dropdown.Item key={index + value.value} title={value.title} value={value.value} />;
                })}
              </List.Dropdown.Section>
            }
            {
              <List.Dropdown.Section title={"Path"}>
                {tagDirectoryPath.map((value, index) => {
                  return <List.Dropdown.Item key={index + value.value} title={value.title} value={value.value} />;
                })}
              </List.Dropdown.Section>
            }
          </List.Dropdown>
        ) : null
      }
    >
      <ListEmptyView />

      {localHiddenDirectory.map(
        (value, index) =>
          (tag === "All" || value.type === tag || value.path.includes(tag)) && (
            <List.Item
              key={value.id}
              icon={isImage(parse(value.path).ext) ? { source: value.path } : { fileIcon: value.path }}
              title={{
                value: value.name,
                tooltip: `Type: ${value.type === DirectoryType.FILE ? "File" : "Folder"}, hidden at ${new Date(
                  value.date,
                ).toLocaleString()}`,
              }}
              accessories={[
                { date: new Date(value.date), tooltip: `Hidden at ${timeStampToDateTime(value.date)}` },
                { icon: Icon.Folder, tooltip: `${parse(value.path).dir}` },
              ]}
              actions={
                <ActionPanel>
                  <Action.Open
                    title={value.type === DirectoryType.FILE ? `Open ${value.name}` : "Open in Finder"}
                    target={value.path}
                  />
                  <Action.ShowInFinder path={value.path} />
                  <ActionPanel.Section>
                    <Action
                      icon={Icon.Eye}
                      title={`Unhide File`}
                      shortcut={{ modifiers: ["cmd"], key: "u" }}
                      onAction={async () => {
                        const _localDirectory = [...localHiddenDirectory];
                        _localDirectory.splice(index, 1);
                        await LocalStorage.setItem(
                          LocalStorageKey.LOCAL_HIDE_DIRECTORY,
                          JSON.stringify(_localDirectory),
                        );
                        setRefresh(refreshNumber());
                        showHiddenFiles(value.path.replaceAll(" ", `" "`));

                        const options: Toast.Options = {
                          style: Toast.Style.Success,
                          title: `Success!`,
                          message: `${value.name} has been unhidden.`,
                          primaryAction: {
                            title: "Open in Finder",
                            onAction: (toast) => {
                              open(value.path);
                              toast.hide();
                            },
                          },
                          secondaryAction: {
                            title: "Show in Finder",
                            onAction: (toast) => {
                              showInFinder(value.path);
                              toast.hide();
                            },
                          },
                        };
                        await showToast(options);
                      }}
                    />
                    <Action
                      icon={Icon.ExclamationMark}
                      title={"Unhide All Files"}
                      shortcut={{ modifiers: ["shift", "cmd"], key: "u" }}
                      onAction={async () => {
                        await alertDialog(
                          Icon.ExclamationMark,
                          "Warning",
                          "Are you sure you want to unhide all files?",
                          "Unhide All",
                          async () => {
                            const filePaths = localHiddenDirectory.map((file) => file.path.replaceAll(" ", `" "`));
                            showHiddenFiles(filePaths.join(" "));
                            await LocalStorage.clear();
                            setRefresh(refreshNumber());
                            await showToast(Toast.Style.Success, "Success!", "All files have been unhidden.");
                          },
                        );
                      }}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section>
                    <Action
                      icon={Icon.Clipboard}
                      title={"Copy File"}
                      shortcut={{ modifiers: ["cmd"], key: "." }}
                      onAction={async () => {
                        await showHUD(`📑 ${value.name} is copied to clipboard`);
                        await Clipboard.copy({ file: value.path });
                      }}
                    />
                    <Action.CopyToClipboard
                      title={"Copy File Name"}
                      content={value.name}
                      shortcut={{ modifiers: ["ctrl", "cmd"], key: "." }}
                    />
                    <Action.CopyToClipboard
                      title={"Copy File Path"}
                      content={value.path}
                      shortcut={{ modifiers: ["ctrl", "cmd"], key: "," }}
                    />
                  </ActionPanel.Section>

                  <ActionOpenCommandPreferences />
                </ActionPanel>
              }
            />
          ),
      )}
    </List>
  );
}
