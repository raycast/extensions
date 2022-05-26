import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  confirmAlert,
  getPreferenceValues,
  Icon,
  List,
  LocalStorage,
  openExtensionPreferences,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchItemInput } from "./util/input";
import { runShortcut, Shortcut, ShortcutSource, tags } from "./util/shortcut";
import CreateShortcut from "./create-shortcut";
import { Preference } from "./util/utils";
import { ANNOTATIONS_SHORTCUTS } from "./build-in/annotation";
import { MARKDOWNS_SHORTCUTS } from "./build-in/markdown";
import { CASES_SHORTCUTS } from "./build-in/case";
import { CODERS_SHORTCUTS } from "./build-in/coder";
import { TIMES_SHORTCUTS } from "./build-in/time";
import { FORMAT_SHORTCUTS } from "./build-in/format";

export default function ShortcutLibrary() {
  const [userShortcuts, setUserShortcuts] = useState<Shortcut[]>([]);
  const [allShortcuts, setAllShortcuts] = useState<Shortcut[]>([]);
  const [detail, setDetail] = useState<string>("");
  const [tag, setTag] = useState<string>("All");
  const [updateList, setUpdateList] = useState<number[]>([0]);
  const [selectId, setSelectId] = useState<number>(0);
  const { push } = useNavigation();
  const { closeMainWindow, annotation, caser, coder, format, markdown, time, rememberTag, showDetail, showTag } =
    getPreferenceValues<Preference>();

  useEffect(() => {
    async function _fetchBuildInShortcut() {
      //user
      const _localStorage = await LocalStorage.getItem<string>("shortcuts");
      let _userShortcuts = [];
      if (typeof _localStorage == "string") {
        _userShortcuts = JSON.parse(_localStorage);
        setUserShortcuts(_userShortcuts);
      }
      //build-in
      let _buildInShortcuts: Shortcut[] = [];
      if (annotation) {
        _buildInShortcuts = [..._buildInShortcuts, ...JSON.parse(ANNOTATIONS_SHORTCUTS)];
      }
      if (caser) {
        _buildInShortcuts = [..._buildInShortcuts, ...JSON.parse(CASES_SHORTCUTS)];
      }
      if (coder) {
        _buildInShortcuts = [..._buildInShortcuts, ...JSON.parse(CODERS_SHORTCUTS)];
      }
      if (format) {
        _buildInShortcuts = [..._buildInShortcuts, ...JSON.parse(FORMAT_SHORTCUTS)];
      }
      if (markdown) {
        _buildInShortcuts = [..._buildInShortcuts, ...JSON.parse(MARKDOWNS_SHORTCUTS)];
      }
      if (time) {
        _buildInShortcuts = [..._buildInShortcuts, ...JSON.parse(TIMES_SHORTCUTS)];
      }
      setAllShortcuts([..._userShortcuts.concat(_buildInShortcuts)]);
    }

    _fetchBuildInShortcut().then();
  }, [updateList]);

  useEffect(() => {
    async function _fetchDetail() {
      if (allShortcuts.length > 0) {
        const _inputItem = await fetchItemInput();
        setDetail(runShortcut(_inputItem.content, allShortcuts[selectId].tactions));
      }
    }

    _fetchDetail().then();
  }, [selectId, allShortcuts]);

  return (
    <List
      isShowingDetail={showDetail}
      isLoading={allShortcuts.length == 0}
      searchBarPlaceholder={"Search shortcuts"}
      onSelectionChange={async (id) => {
        setSelectId(Number(id));
      }}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Shortcut Tags"
          storeValue={rememberTag}
          onChange={async (newValue) => {
            setTag(newValue);
          }}
        >
          <List.Dropdown.Item key={"all"} title={"All"} value={"All"} />
          {tags.map((value) => {
            return <List.Dropdown.Item key={value} title={value} value={value} />;
          })}
        </List.Dropdown>
      }
    >
      {allShortcuts.map((value, index) => {
        if (value.info.tag.includes(tag) || tag === "All") {
          return (
            <List.Item
              id={index + ""}
              icon={{
                source: value.info.icon,
                tintColor: value.info.source === ShortcutSource.USER ? Color.Blue : "",
              }}
              title={value.info.name}
              accessories={[showTag ? { text: value.info.tag[0], tooltip: `${value.info.tag.join(", ")}` } : {}]}
              key={index}
              detail={<List.Item.Detail markdown={`${detail}`} />}
              actions={(() => {
                if (value.info.source === ShortcutSource.buildIn) {
                  return (
                    <ActionPanel>
                      <Action
                        title={"Run Shortcut"}
                        icon={Icon.TwoArrowsClockwise}
                        onAction={async () => {
                          const _inputItem = await fetchItemInput();
                          const _runShortcut = runShortcut(_inputItem.content, value.tactions);
                          await Clipboard.paste(_runShortcut);
                          if (closeMainWindow) {
                            await showHUD("Pasted result to active app");
                          } else {
                            await showToast(Toast.Style.Success, "Pasted result to active app!");
                          }
                        }}
                      />
                      <Action
                        title={"Create Shortcut"}
                        icon={Icon.Download}
                        shortcut={{ modifiers: ["cmd"], key: "n" }}
                        onAction={async () => {
                          push(
                            <CreateShortcut shortcut={undefined} updateListUseState={[updateList, setUpdateList]} />
                          );
                        }}
                      />
                      <ActionPanel.Section>
                        <Action
                          icon={Icon.Gear}
                          title="Open Extension Preferences"
                          shortcut={{ modifiers: ["cmd"], key: "," }}
                          onAction={openExtensionPreferences}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  );
                } else {
                  return (
                    <>
                      <ActionPanel>
                        <Action
                          title={"Run Shortcut"}
                          icon={Icon.TwoArrowsClockwise}
                          onAction={async () => {
                            const _inputItem = await fetchItemInput();
                            const _runShortcut = runShortcut(_inputItem.content, value.tactions);
                            await Clipboard.paste(_runShortcut);
                            if (closeMainWindow) {
                              await showHUD("Pasted result to active app");
                            } else {
                              await showToast(Toast.Style.Success, "Pasted result to active app!");
                            }
                          }}
                        />
                        <Action
                          title={"Edit Shortcut"}
                          icon={Icon.Pencil}
                          onAction={async () => {
                            push(<CreateShortcut shortcut={value} updateListUseState={[updateList, setUpdateList]} />);
                          }}
                        />
                        <Action
                          title={"Create Shortcut"}
                          icon={Icon.Download}
                          shortcut={{ modifiers: ["cmd"], key: "n" }}
                          onAction={async () => {
                            push(
                              <CreateShortcut shortcut={undefined} updateListUseState={[updateList, setUpdateList]} />
                            );
                          }}
                        />
                        <Action
                          title={"Remove Shortcut"}
                          icon={Icon.Trash}
                          shortcut={{ modifiers: ["ctrl"], key: "x" }}
                          onAction={async () => {
                            if (
                              await confirmAlert({
                                icon: Icon.Trash,
                                title: "Remove Shortcut",
                                message: `Are you sure you want remove shortcut ${value.info.name}?`,
                              })
                            ) {
                              const newShortCuts = [...userShortcuts];
                              newShortCuts.splice(index, 1);
                              await showToast(Toast.Style.Success, "Successfully removed shortcut!");
                              await LocalStorage.setItem("shortcuts", JSON.stringify(newShortCuts));
                              const _updateList = [...updateList];
                              _updateList[0]++;
                              setUpdateList(_updateList);
                            }
                          }}
                        />
                        <Action
                          title={"Remove All Shortcuts"}
                          icon={Icon.ExclamationMark}
                          shortcut={{ modifiers: ["shift", "ctrl"], key: "x" }}
                          onAction={async () => {
                            if (
                              await confirmAlert({
                                icon: Icon.ExclamationMark,
                                title: "Remove All Shortcuts",
                                message: "Are you sure you want remove all custom shortcuts?",
                              })
                            ) {
                              await showToast(Toast.Style.Success, "Successfully removed all shortcuts!");
                              await LocalStorage.clear();
                              const _updateList = [...updateList];
                              _updateList[0]++;
                              setUpdateList(_updateList);
                            }
                          }}
                        />
                        <ActionPanel.Section>
                          <Action
                            icon={Icon.Gear}
                            title="Open Extension Preferences"
                            shortcut={{ modifiers: ["cmd"], key: "," }}
                            onAction={openExtensionPreferences}
                          />
                        </ActionPanel.Section>
                      </ActionPanel>
                    </>
                  );
                }
              })()}
            />
          );
        }
      })}
    </List>
  );
}
