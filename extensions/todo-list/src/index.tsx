import { environment, List } from "@raycast/api";
import { useEffect, useState } from "react";
import fs from "fs/promises";
import { editingAtom, searchBarTextAtom, searchModeAtom, todoAtom } from "./atoms";
import { useAtom } from "jotai";
import { DEFAULT_SECTIONS, TODO_FILE } from "./config";
import TodoSection from "./todo_section";
import ListActions from "./list_actions";

export default function TodoList() {
  const [, setTodoSections] = useAtom(todoAtom);
  const [searchMode] = useAtom(searchModeAtom);
  const [loading, setLoading] = useState(true);
  const [searchBarText, setSearchBarText] = useAtom(searchBarTextAtom);
  const [editing] = useAtom(editingAtom);
  useEffect(() => {
    (async () => {
      try {
        const storedItemsBuffer = await fs.readFile(TODO_FILE);
        const storedItems = JSON.parse(storedItemsBuffer.toString());
        // from v1 where items were stored in an array
        if (Array.isArray(storedItems)) {
          const storedPinned = storedItems[0];
          const storedTodo = [];
          const storedCompleted = [];
          for (const todo of storedItems[1]) {
            if (todo.completed) {
              storedCompleted.push(todo);
            } else {
              storedTodo.push(todo);
            }
          }
          const convertedStoredItems = {
            pinned: storedPinned,
            todo: storedTodo,
            completed: storedCompleted,
          };
          setTodoSections(convertedStoredItems);
        } else {
          setTodoSections(storedItems);
        }
      } catch (error) {
        await fs.mkdir(environment.supportPath, { recursive: true });
        setTodoSections(DEFAULT_SECTIONS);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <List
      navigationTitle={`Manage Todo List${editing !== false ? " • Editing" : searchMode ? " • Searching" : ""}`}
      key={searchMode ? "search" : "nosearch"}
      isLoading={loading}
      actions={<ListActions />}
      enableFiltering={searchMode}
      searchText={searchBarText}
      onSearchTextChange={(text: string) => setSearchBarText(text)}
      searchBarPlaceholder={searchMode ? "Search todos" : "Type and hit enter to add an item to your list"}
    >
      <TodoSection sectionKey="pinned" />
      <TodoSection sectionKey="todo" />
      <TodoSection sectionKey="completed" />
    </List>
  );
}
