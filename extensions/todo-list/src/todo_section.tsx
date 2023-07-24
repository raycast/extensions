import { List } from "@raycast/api";
import { useAtom } from "jotai";
import { todoAtom, TodoSections, TodoItem } from "./atoms";
import { SECTIONS_DATA, preferences } from "./config";
import SingleTodoItem from "./todo_item";
const TodoSection = ({ sectionKey }: { sectionKey: keyof TodoSections }) => {
  const [todoSections] = useAtom(todoAtom);

  function sort(a: TodoItem, b: TodoItem) {
    const { sortOrder } = preferences;
    if ((a.priority || b.priority) && a.priority != b.priority) {
      return (b.priority ?? 0) - (a.priority ?? 0);
    }
    return sortOrder == "creation_date_accending" ? a.timeAdded - b.timeAdded : b.timeAdded - a.timeAdded;
  }

  return (
    <List.Section title={SECTIONS_DATA[sectionKey].name}>
      {todoSections[sectionKey].sort(sort).map((item, i) => (
        <SingleTodoItem item={item} key={i} idx={i} sectionKey={sectionKey} />
      ))}
    </List.Section>
  );
};
export default TodoSection;
