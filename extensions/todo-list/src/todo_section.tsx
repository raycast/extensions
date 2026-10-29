import { List } from "@raycast/api";
import { useAtom } from "jotai";
import { ALL_TAG_VALUE, todoAtom, TodoSections } from "./atoms";
import { SECTIONS_DATA } from "./config";
import SingleTodoItem from "./todo_item";
import { sortTodoItem } from "./utils";
const TodoSection = ({ sectionKey, selectedTag }: { sectionKey: keyof TodoSections; selectedTag: string }) => {
  const [todoSections] = useAtom(todoAtom);

  return (
    <List.Section title={SECTIONS_DATA[sectionKey].name}>
      {todoSections[sectionKey]
        .map((item, idx) => ({ item, idx }))
        .sort((a, b) => sortTodoItem(a.item, b.item))
        .map(({ item, idx }) =>
          selectedTag == item.tag || selectedTag == ALL_TAG_VALUE ? (
            <SingleTodoItem idx={idx} item={item} key={idx} sectionKey={sectionKey} />
          ) : null,
        )}
    </List.Section>
  );
};
export default TodoSection;
