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
      actions={<ListActions />}
      enableFiltering={searchMode}
      key={searchMode ? "search" : "nosearch"}
      navigationTitle={`Manage Todo List${editing !== false ? " • Editing" : searchMode ? " • Searching" : ""}`}
      onSearchTextChange={(text: string) => setSearchBarText(text)}
      searchBarPlaceholder={searchMode ? "Search todos" : "Type and hit enter to add an item to your list"}
      searchText={searchBarText}
    >
      <TodoSection sectionKey="pinned" />
      <TodoSection sectionKey="todo" />
      <TodoSection sectionKey="completed" />
    </List>
  );
}
