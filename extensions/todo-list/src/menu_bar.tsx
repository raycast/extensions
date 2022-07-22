import { TodoItem, TodoSections, todoAtom } from "./atoms";

import { MenuBarExtra } from "@raycast/api";
import MenuBarTodoItem from "./menu_bar_todo_item";
import { SECTIONS_DATA } from "./config";
import { useAtom } from "jotai";

export default function MenuBar() {
  const [todoSections] = useAtom(todoAtom);

  return (
    <MenuBarExtra icon="../assets/command-icon-menubar.png" tooltip="Your Pull Requests">
      <TodoList sectionKey="pinned" todos={todoSections["pinned"]} />
      <TodoList sectionKey="todo" todos={todoSections["todo"]} />
      <TodoList sectionKey="completed" todos={todoSections["completed"]} />
    </MenuBarExtra>
  );
}

const TodoList = ({ sectionKey, todos }: { sectionKey: keyof TodoSections; todos: TodoItem[] }) => {
  if (todos.length === 0) return null;
  return (
    <>
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item title={SECTIONS_DATA[sectionKey].name} />
      {todos.map((todo, idx) => (
        <MenuBarTodoItem key={idx} item={todo} idx={idx} sectionKey={sectionKey} />
      ))}
    </>
  );
};
