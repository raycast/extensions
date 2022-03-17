import {
  List,
  LocalStorage,
  showToast,
  Toast,
  Clipboard,
  ActionPanel,
  Action,
  popToRoot,
  showHUD,
  Icon,
  useNavigation,
  confirmAlert,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchItemInput, ItemInput, ItemSource } from "./util/input";
import { runShortcut, Shortcut, ShortcutSource, tags } from "./util/shortcut";
import CreateShortcut from "./create-shortcut";
import { preferences } from "./util/utils";
import { ANNOTATIONS_SHORTCUTS } from "./build-in/annotation";
import { MARKDOWNS_SHORTCUTS } from "./build-in/markdown";
import { CASES_SHORTCUTS } from "./build-in/case";
import { CODERS_SHORTCUTS } from "./build-in/coder";
import { TIMES_SHORTCUTS } from "./build-in/time";

export default function SearchShortcut() {
  const [itemInput, setItemInput] = useState<ItemInput>(new ItemInput());
  const [userShortcuts, setUserShortcuts] = useState<Shortcut[]>([]);
  const [allShortcuts, setAllShortcuts] = useState<Shortcut[]>([]);
  const [detail, setDetail] = useState<string>("");
  const [tag, setTag] = useState<string>("All");
  const { push } = useNavigation();

  useEffect(() => {
    async function _fetchBuildInShortcut() {
      //user
      const _localStorage = await LocalStorage.getItem<string>("shortcuts");
      let _userShortcuts = [];
      if (typeof _localStorage == "string") {
        _userShortcuts = JSON.parse(_localStorage);
        setUserShortcuts(_userShortcuts);
      }
    }

    _fetchBuildInShortcut().then();
  }, []);

  useEffect(() => {
    async function _fetchBuildInShortcut() {
      //build-in
      let _buildInShortcuts: Shortcut[] = [];
      if (preferences().annotation) {
        _buildInShortcuts = [..._buildInShortcuts, ...JSON.parse(ANNOTATIONS_SHORTCUTS)];
      }
      if (preferences().case) {
        _buildInShortcuts = [..._buildInShortcuts, ...JSON.parse(CASES_SHORTCUTS)];
      }
      if (preferences().coder) {
        _buildInShortcuts = [..._buildInShortcuts, ...JSON.parse(CODERS_SHORTCUTS)];
      }
      if (preferences().markdown) {
        _buildInShortcuts = [..._buildInShortcuts, ...JSON.parse(MARKDOWNS_SHORTCUTS)];
      }
      if (preferences().time) {
        _buildInShortcuts = [..._buildInShortcuts, ...JSON.parse(TIMES_SHORTCUTS)];
      }
      setAllShortcuts([...userShortcuts].concat(_buildInShortcuts));
    }

    _fetchBuildInShortcut().then();
  }, [userShortcuts]);

  useEffect(() => {
    async function _fetchItemInput() {
      const inputItem = await fetchItemInput();
      if (inputItem.source == ItemSource.NULL) {
        await showToast(Toast.Style.Failure, "Nothing is detected from Selected or Clipboard!");
      } else {
        setItemInput(inputItem);
      }
    }

    _fetchItemInput().then();
  }, []);

  return (
    <List
      isShowingDetail={true}
      isLoading={allShortcuts.length == 0}
      searchBarPlaceholder={"Search shortcut"}
      onSelectionChange={(id) => {
        setDetail(runShortcut(itemInput.content, allShortcuts[Number(id)]));
      }}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Shortcut Tags"
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
              icon={value.info.icon}
              title={value.info.name}
              key={index}
              detail={<List.Item.Detail markdown={`${detail}`} />}
              actions={(() => {
                if (value.info.source === ShortcutSource.buildIn) {
                  return (
                    <ActionPanel>
                      <Action
                        title={"Run Shortcut"}
                        icon={Icon.Hammer}
                        onAction={async () => {
                          const _runShortcut = runShortcut(itemInput.content, value);
                          await Clipboard.paste(_runShortcut);
                          await showHUD("Paste Shortcut's Text");
                          await popToRoot({ clearSearchBar: false });
                        }}
                      />
                    </ActionPanel>
                  );
                } else {
                  return (
                    <>
                      <ActionPanel>
                        <Action
                          title={"Run Shortcut"}
                          icon={Icon.Hammer}
                          onAction={async () => {
                            const _runShortcut = runShortcut(itemInput.content, value);
                            await Clipboard.paste(_runShortcut);
                            await showHUD("Paste Shortcut's Text");
                            await popToRoot({ clearSearchBar: false });
                          }}
                        />
                        <Action
                          title={"Edit Shortcut"}
                          icon={Icon.Pencil}
                          onAction={async () => {
                            push(<CreateShortcut shortcut={value} />);
                          }}
                        />
                        <Action
                          title={"Remove Shortcut"}
                          icon={Icon.Trash}
                          shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                          onAction={async () => {
                            const newShortCuts = [...userShortcuts];
                            newShortCuts.splice(index, 1);
                            setUserShortcuts(newShortCuts);
                            await showToast(Toast.Style.Success, "Remove Shortcut");
                            await LocalStorage.setItem("shortcuts", JSON.stringify(newShortCuts));
                          }}
                        />
                        <Action
                          title={"Remove All Shortcuts"}
                          icon={Icon.ExclamationMark}
                          shortcut={{ modifiers: ["shift", "cmd"], key: "backspace" }}
                          onAction={async () => {
                            if (
                              await confirmAlert({ title: "Are you sure?", message: "Remove all custom shortcuts" })
                            ) {
                              setUserShortcuts([]);
                              await showToast(Toast.Style.Success, "Remove All Shortcuts");
                              await LocalStorage.clear();
                            }
                          }}
                        />
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
