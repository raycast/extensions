import { List } from "@raycast/api";
import { useAtom } from "jotai";
import { todoAtom, TodoSections } from "./atoms";
import { SECTIONS_DATA } from "./config";
import SingleTodoItem from "./todo_item";
import { sortTodoItem } from "./utils";
const TodoSection = ({ sectionKey }: { sectionKey: keyof TodoSections }) => {
  const [todoSections] = useAtom(todoAtom);

  return (
    <List.Section title={SECTIONS_DATA[sectionKey].name}>
      {todoSections[sectionKey].sort(sortTodoItem).map((item, i) => (
        <SingleTodoItem item={item} key={i} idx={i} sectionKey={sectionKey} />
      ))}
    </List.Section>
  );
};
export default TodoSection;
