import { Action, ActionPanel, Icon, List, LocalStorage, open, showInFinder, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { extensionPreferences, isImage } from "./utils/common-utils";
import { parse } from "path";
import { DirectoryType, tagDirectoryPath, tagDirectoryType } from "./utils/directory-info";
import { showHiddenFiles } from "./utils/hide-files-utils";
import { LocalStorageKey } from "./utils/constants";
import { alertDialog, getHiddenFiles, refreshNumber } from "./hooks/hooks";

export default function Command() {
  const [tag, setTag] = useState<string>("All");
  const { folderFirst } = extensionPreferences();
  const [refresh, setRefresh] = useState<number>(0);

  const { localHiddenDirectory, loading } = getHiddenFiles(folderFirst, refresh);

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search hidden files"
      searchBarAccessory={
        localHiddenDirectory.length !== 0 ? (
          <List.Dropdown onChange={setTag} tooltip={"Directory type"}>
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
      {localHiddenDirectory.length === 0 ? (
        <List.EmptyView
          key={`empty-localDirectory`}
          title={"No hidden files"}
          icon={{ source: { light: "empty-list.png", dark: "empty-list@dark.png" } }}
          description={`You can hide files via "Hide Files" command`}
        />
      ) : (
        <>
          {localHiddenDirectory.map(
            (value, index) =>
              (tag === "All" || value.type === tag || value.path.includes(tag)) && (
                <List.Item
                  key={value.id}
                  icon={isImage(parse(value.path).ext) ? { source: value.path } : { fileIcon: value.path }}
                  title={value.name}
                  accessories={[{ text: parse(value.path).dir }]}
                  actions={
                    <ActionPanel>
                      <Action.Open
                        title={value.type === DirectoryType.FILE ? "Open with Default App" : "Open in Finder"}
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
                              JSON.stringify(_localDirectory)
                            );
                            setRefresh(refreshNumber());
                            showHiddenFiles(value.path.replace(" ", `" "`));

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
                                const filePaths = localHiddenDirectory.map((file) => file.path.replace(" ", `" "`));
                                showHiddenFiles(filePaths.join(" "));
                                await LocalStorage.clear();
                                setRefresh(refreshNumber());
                                await showToast(Toast.Style.Success, "Success!", "All Files have been unhidden.");
                              }
                            );
                          }}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              )
          )}
        </>
      )}
    </List>
  );
}
