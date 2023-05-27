import { List } from "@raycast/api";
import { useAtom } from "jotai";
import { todoAtom, TodoSections } from "./atoms";
import { SECTIONS_DATA } from "./config";
import SingleTodoItem from "./todo_item";
const TodoSection = ({ sectionKey }: { sectionKey: keyof TodoSections }) => {
  const [todoSections] = useAtom(todoAtom);
  const total_items = todoSections.pinned.length + todoSections.completed.length + todoSections.todo.length;
  const ratio = todoSections.todo.length / total_items * 100;
  // const calculateRatio = () => {
  //   const total_items = todoSections.pinned.length + todoSections.completed.length + todoSections.todo.length;
  //   const ratio = todoSections.todo.length / total_items;
  const string_title: string = (sectionKey === "completed") ? `Completed ${ratio}%` : SECTIONS_DATA[sectionKey].name
  return (
    <List.Section title={string_title}>
      {todoSections[sectionKey].map((item, i) => (
        <SingleTodoItem item={item} key={i} idx={i} sectionKey={sectionKey} />
      ))}
    </List.Section>
  );
};
export default TodoSection;
