import { Action, ActionPanel, Icon, List, LocalStorage, open, showHUD, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { checkDirectoryValid, extensionPreferences, getLocalStorage, isEmpty, isImage } from "./utils/common-utils";
import { parse } from "path";
import { DirectoryInfo, DirectoryType, tagDirectoryPath, tagDirectoryType } from "./utils/directory-info";
import { showHiddenFiles } from "./utils/hide-files-utils";
import { LocalStorageKey } from "./utils/constants";

export default function Command() {
  const [localDirectory, setLocalDirectory] = useState<DirectoryInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [tag, setTag] = useState<string>("All");
  const { folderFirst } = extensionPreferences();

  useEffect(() => {
    async function _initRunAppleScript() {
      const _localstorage = await getLocalStorage(LocalStorageKey.LOCAL_HIDE_DIRECTORY);
      let localDirectory: DirectoryInfo[] = [];
      if (!isEmpty(_localstorage)) {
        localDirectory = JSON.parse(_localstorage) as DirectoryInfo[];
      }
      const localDirectoryReverse = localDirectory;
      const localFolder = localDirectoryReverse.filter((value) => value.type === DirectoryType.DIRECTORY);
      const localFile = localDirectoryReverse.filter((value) => value.type === DirectoryType.FILE);

      //check invalid directory
      const _validDirectory = checkDirectoryValid(
        folderFirst ? [...localFolder, ...localFile] : [...localFile, ...localFolder]
      );
      setLocalDirectory(_validDirectory);
      setLoading(false);
      await LocalStorage.setItem(LocalStorageKey.LOCAL_HIDE_DIRECTORY, JSON.stringify(_validDirectory));
    }

    _initRunAppleScript().then();
  }, []);

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search hidden files"
      searchBarAccessory={
        localDirectory.length !== 0 && (
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
        )
      }
    >
      {localDirectory.length === 0 ? (
        <List.EmptyView
          key={`empty-localDirectory`}
          title={"No hidden files."}
          icon={{ source: { light: "empty-list.png", dark: "empty-list@dark.png" } }}
          description={`You can hide files via "Hide Files" command.`}
        />
      ) : (
        <>
          {localDirectory.map(
            (value, index) =>
              (tag === "All" || value.type === tag || value.path.includes(tag)) && (
                <List.Item
                  key={value.id}
                  icon={isImage(parse(value.path).ext) ? { source: value.path } : { fileIcon: value.path }}
                  title={value.name}
                  accessories={[{ text: parse(value.path).dir }]}
                  actions={
                    <ActionPanel>
                      <Action
                        icon={Icon.Window}
                        title={value.type === DirectoryType.FILE ? "Open in Default App" : "Open in Finder"}
                        onAction={async () => {
                          try {
                            await open(value.path);
                            await showHUD(value.type === DirectoryType.FILE ? "Open in Default App" : "Open in Finder");
                          } catch (e) {
                            await showToast(Toast.Style.Failure, "Error.", String(e) + ".");
                          }
                        }}
                      />
                      <Action
                        icon={Icon.Finder}
                        title={"Reveal in Finder"}
                        onAction={async () => {
                          await open(parse(value.path).dir);
                          try {
                            await open(parse(value.path).dir);
                            await showHUD("Reveal in Finder");
                          } catch (e) {
                            await showToast(Toast.Style.Failure, "Error.", String(e) + ".");
                          }
                        }}
                      />
                      <ActionPanel.Section title="File Actions">
                        <Action
                          icon={Icon.Eye}
                          title={`Show File`}
                          shortcut={{ modifiers: ["cmd"], key: "s" }}
                          onAction={async () => {
                            const _localDirectory = [...localDirectory];
                            _localDirectory.splice(index, 1);
                            setLocalDirectory(_localDirectory);
                            await LocalStorage.setItem(
                              LocalStorageKey.LOCAL_HIDE_DIRECTORY,
                              JSON.stringify(_localDirectory)
                            );
                            showHiddenFiles(value.path.replace(" ", `" "`));

                            const options: Toast.Options = {
                              style: Toast.Style.Success,
                              title: `Success!`,
                              message: `${value.name} has been shown.`,
                              primaryAction: {
                                title: "Open in Finder",
                                onAction: (toast) => {
                                  open(value.path);
                                  toast.hide();
                                },
                              },
                              secondaryAction: {
                                title: "Reveal in Finder",
                                onAction: (toast) => {
                                  open(parse(value.path).dir);
                                  toast.hide();
                                },
                              },
                            };
                            await showToast(options);
                          }}
                        />
                        <Action
                          icon={Icon.ExclamationMark}
                          title={"Show All Files"}
                          shortcut={{ modifiers: ["shift", "cmd"], key: "s" }}
                          onAction={async () => {
                            const filePaths = localDirectory.map((file) => file.path.replace(" ", `" "`));
                            showHiddenFiles(filePaths.join(" "));
                            await LocalStorage.clear();
                            setLocalDirectory([]);
                            await showToast(Toast.Style.Success, "Success!", "All Files have been shown.");
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
