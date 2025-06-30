import { Action, ActionPanel, clearSearchBar, Color, Icon, showToast, Toast } from "@raycast/api";
import { useAtom } from "jotai";
import _ from "lodash";
import { editingAtom, newTodoTextAtom, searchBarTextAtom, searchModeAtom, todoAtom } from "./atoms";
import DeleteAllAction from "./delete_all";
import SearchModeAction from "./search_mode_action";
import { compare, insertIntoSection, parseTodoItem } from "./utils";

const ListActions = () => {
  const [searchMode] = useAtom(searchModeAtom);
  const [newTodoText] = useAtom(newTodoTextAtom);
  const [todoSections, setTodoSections] = useAtom(todoAtom);
  const [, setSearchBarText] = useAtom(searchBarTextAtom);
  const [editing, setEditing] = useAtom(editingAtom);

  const addTodo = async () => {
    if (newTodoText.length === 0) {
      await showToast(Toast.Style.Failure, "Empty todo", "Todo items cannot be empty.");
      return;
    }
    const newItem = parseTodoItem(newTodoText);
    todoSections.todo = [...insertIntoSection(todoSections.todo, newItem, compare)];
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
  return (
    <ActionPanel>
      {!searchMode && <Action icon={Icon.Plus} onAction={() => addTodo()} title="Create Todo" />}
      <SearchModeAction />
      <DeleteAllAction />
    </ActionPanel>
  );
};
export default ListActions;
