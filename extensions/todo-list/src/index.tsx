import { List } from "@raycast/api";
import { editingAtom, searchBarTextAtom, searchModeAtom } from "./atoms";
import { useAtom } from "jotai";
import TodoSection from "./todo_section";
import ListActions from "./list_actions";

export default function TodoList() {
  const [searchMode] = useAtom(searchModeAtom);
  const [searchBarText, setSearchBarText] = useAtom(searchBarTextAtom);
  const [editing] = useAtom(editingAtom);

  return (
    <List
      navigationTitle={`Manage Todo List${editing !== false ? " • Editing" : searchMode ? " • Searching" : ""}`}
      key={searchMode ? "search" : "nosearch"}
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
