import { List } from "@raycast/api";
import { useAtom } from "jotai";
import { todoAtom, TodoSections, TodoItem } from "./atoms";
import { SECTIONS_DATA, preferences } from "./config";
import SingleTodoItem from "./todo_item";
const TodoSection = ({ sectionKey }: { sectionKey: keyof TodoSections }) => {
  const [todoSections] = useAtom(todoAtom);

  function sort(items: TodoItem[]) {
    const { sortOrder } = preferences;
    if (sortOrder == "creation_date_accending") return items;
    else return items.sort((a, b) => b.timeAdded - a.timeAdded);
  }

  return (
    <List.Section title={SECTIONS_DATA[sectionKey].name}>
      {sort(todoSections[sectionKey]).map((item, i) => (
        <SingleTodoItem item={item} key={i} idx={i} sectionKey={sectionKey} />
      ))}
    </List.Section>
  );
};
export default TodoSection;
