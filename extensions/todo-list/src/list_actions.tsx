import { Action, ActionPanel, clearSearchBar, Color, Icon, showToast, Toast } from "@raycast/api";
import { useAtom } from "jotai";
import _ from "lodash";
import {
  editingAtom,
  editingTagAtom,
  newTodoTextAtom,
  newTodoTagAtom,
  searchBarTextAtom,
  searchModeAtom,
  todoAtom,
} from "./atoms";
import DeleteAllAction from "./delete_all";
import SearchModeAction from "./search_mode_action";
import { compare, insertIntoSection } from "./utils";

const ListActions = () => {
  const [searchMode] = useAtom(searchModeAtom);
  const [newTodoText] = useAtom(newTodoTextAtom);
  const [newTodoTag] = useAtom(newTodoTagAtom);
  const [todoSections, setTodoSections] = useAtom(todoAtom);
  const [, setSearchBarText] = useAtom(searchBarTextAtom);
  const [editing, setEditing] = useAtom(editingAtom);
  const [editingTag, setEditingTag] = useAtom(editingTagAtom);

  const addTodo = async () => {
    if (newTodoText.length === 0) {
      await showToast(Toast.Style.Failure, "Empty todo", "Todo items cannot be empty.");
      return;
    }
    todoSections.todo = [
      ...insertIntoSection(
        todoSections.todo,
        {
          title: newTodoText,
          completed: false,
          timeAdded: Date.now(),
        },
        compare
      ),
    ];
    await clearSearchBar();
    setTodoSections(_.cloneDeep(todoSections));
  };
  const editTodo = async () => {
    if (!editing) return;
    if (newTodoText.length === 0) {
      await showToast(Toast.Style.Failure, "Empty todo", "Todo items cannot be empty.");
      return;
    }
    todoSections[editing.sectionKey].splice(editing.index, 1, {
      ...todoSections[editing.sectionKey][editing.index],
      title: newTodoText,
    });
    setTodoSections(_.cloneDeep(todoSections));
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
  const editTodoTag = async () => {
    if (!editingTag) return;
    if (newTodoTag.length === 0) {
      await showToast(Toast.Style.Failure, "Empty tag", "Todo tag cannot be empty.");
      return;
    }
    todoSections[editingTag.sectionKey].splice(editingTag.index, 1, {
      ...todoSections[editingTag.sectionKey][editingTag.index],
      tag: newTodoTag,
    });
    setTodoSections(_.cloneDeep(todoSections));
    setEditingTag(false);
    setSearchBarText("");
  };
  if (editingTag) {
    return (
      <ActionPanel>
        <Action
          icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
          onAction={() => editTodoTag()}
          title="Apply Edits"
        />
        <Action
          icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
          onAction={() => {
            setEditingTag(false);
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
    </ActionPanel>
  );
};
export default ListActions;
