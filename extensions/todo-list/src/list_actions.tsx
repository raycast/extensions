import BackupActions from "./backup_actions";
import { Action, ActionPanel, clearSearchBar, Color, Icon, showToast, Toast } from "@raycast/api";
import { useAtom } from "jotai";
import _ from "lodash";
import {
  ALL_TAG_VALUE,
  editingAtom,
  newTodoTextAtom,
  searchBarTextAtom,
  searchModeAtom,
  selectedTagAtom,
  todoAtom,
} from "./atoms";
import DeleteAllAction from "./delete_all";
import SearchModeAction from "./search_mode_action";
import { compare, insertIntoSection, parseTodoItem } from "./utils";

const ListActions = () => {
  const [searchMode] = useAtom(searchModeAtom);
  const [newTodoText] = useAtom(newTodoTextAtom);
  const [savedSections, setTodoSections] = useAtom(todoAtom);
  const [, setSearchBarText] = useAtom(searchBarTextAtom);
  const [editing, setEditing] = useAtom(editingAtom);
  const [selectedTag] = useAtom(selectedTagAtom);

  const addTodo = async () => {
    if (newTodoText.length === 0) {
      await showToast(Toast.Style.Failure, "Empty todo", "Todo items cannot be empty.");
      return;
    }
    const newItem = parseTodoItem(newTodoText);
    // If the list is filtered by a tag, default new todos to that tag (unless user explicitly provided one).
    if (selectedTag !== ALL_TAG_VALUE && (!newItem.tag || newItem.tag.trim().length === 0)) {
      newItem.tag = selectedTag;
    }
    const todoSections = _.cloneDeep(savedSections);
    todoSections.todo = [...insertIntoSection(todoSections.todo, newItem, compare)];
    setTodoSections(todoSections);
    await clearSearchBar();
    setSearchBarText("");
  };
  const editTodo = async () => {
    if (!editing) return;
    if (newTodoText.length === 0) {
      await showToast(Toast.Style.Failure, "Empty todo", "Todo items cannot be empty.");
      return;
    }
    const todoSections = _.cloneDeep(savedSections);
    todoSections[editing.sectionKey].splice(editing.index, 1, {
      ...todoSections[editing.sectionKey][editing.index],
      title: newTodoText,
    });
    setTodoSections(todoSections);
    setEditing(false);
    setSearchBarText("");
  };
  if (editing) {
    return (
      <ActionPanel>
        <Action
          icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
          onAction={() => editTodo()}
          title="Apply Edits"
        />
        <Action
          icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
          onAction={() => {
            setEditing(false);
            setSearchBarText("");
          }}
          title="Cancel"
        />
      </ActionPanel>
    );
  }
  return (
    <ActionPanel>
      {!searchMode && <Action icon={Icon.Plus} onAction={() => addTodo()} title="Create Todo" />}
      <SearchModeAction />
      <DeleteAllAction />
      <BackupActions />
    </ActionPanel>
  );
};
export default ListActions;
