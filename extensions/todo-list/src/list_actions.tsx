import { Action, ActionPanel, clearSearchBar, Color, Icon, showToast, Toast } from "@raycast/api";
import { useAtom } from "jotai";
import _ from "lodash";
import { editingAtom, newTodoTextAtom, searchBarTextAtom, searchModeAtom, todoAtom } from "./atoms";
import DeleteAllAction from "./delete_all";
import SearchModeAction from "./search_mode_action";
import { compare, insertIntoSection } from "./utils";

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
          title="Apply Edits"
          onAction={() => editTodo()}
          icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
        />
        <Action
          title="Cancel"
          onAction={() => {
            setEditing(false);
            setSearchBarText("");
          }}
          icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
        />
      </ActionPanel>
    );
  }
  return (
    <ActionPanel>
      {!searchMode && <Action title="Create Todo" onAction={() => addTodo()} icon={Icon.Plus} />}
      <SearchModeAction />
      <DeleteAllAction />
    </ActionPanel>
  );
};
export default ListActions;
