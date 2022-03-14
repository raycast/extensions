import { ActionPanel, clearSearchBar, List, showToast, ToastStyle } from "@raycast/api";
import { useState } from "react";
import { searchModeAtom, todoAtom } from "./atoms";
import { useAtom } from "jotai";
import _ from "lodash";
import { insertIntoSection, compare } from "./utils";
import DeleteAllAction from "./delete_all";
import TodoSection from "./todo_section";
import SearchModeAction from "./search_mode_action";

export default function TodoList() {
  const [todoSections, setTodoSections] = useAtom(todoAtom);
  const [newTodoText, setNewTodoText] = useState("");
  const [searchMode] = useAtom(searchModeAtom);

  const addTodo = async () => {
    if (newTodoText.length === 0) {
      await showToast(ToastStyle.Failure, "Empty todo", "Todo items cannot be empty.");
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
  return (
    <List
      key={searchMode ? "search" : "nosearch"}
      actions={
        <ActionPanel>
          {!searchMode && <ActionPanel.Item title="Create Todo" onAction={() => addTodo()} />}
          <SearchModeAction />
          <DeleteAllAction />
        </ActionPanel>
      }
      onSearchTextChange={searchMode ? undefined : (text: string) => setNewTodoText(text.trimEnd())}
      searchBarPlaceholder={searchMode ? "Search todos" : "Type and hit enter to add an item to your list"}
    >
      <TodoSection sectionKey="pinned" />
      <TodoSection sectionKey="todo" />
      <TodoSection sectionKey="completed" />
    </List>
  );
}
