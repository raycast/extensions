import { List } from "@raycast/api";
import { editingAtom, selectedTagAtom, searchBarTextAtom, searchModeAtom } from "./atoms";
import { useAtom } from "jotai";
import TodoSection from "./todo_section";
import ListActions from "./list_actions";
import ListTags from "./list_tags";

export default function TodoList() {
  const [searchMode] = useAtom(searchModeAtom);
  const [searchBarText, setSearchBarText] = useAtom(searchBarTextAtom);
  const [editing] = useAtom(editingAtom);
  const [selectedTag] = useAtom(selectedTagAtom);

  return (
    <List
      actions={<ListActions />}
      enableFiltering={searchMode}
      key={searchMode ? "search" : "nosearch"}
      navigationTitle={`Manage Todo List${editing !== false ? " • Editing" : searchMode ? " • Searching" : ""}`}
      onSearchTextChange={(text: string) => setSearchBarText(text)}
      searchBarAccessory={<ListTags />}
      searchBarPlaceholder={searchMode ? "Search todos" : "Type and hit enter to add an item to your list"}
      searchText={searchBarText}
    >
      <TodoSection sectionKey="pinned" selectedTag={selectedTag} />
      <TodoSection sectionKey="todo" selectedTag={selectedTag} />
      <TodoSection sectionKey="completed" selectedTag={selectedTag} />
    </List>
  );
}
