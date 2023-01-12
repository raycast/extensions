import { TodoItem, TodoSections, todoAtom } from "./atoms";

import { MenuBarExtra } from "@raycast/api";
import MenuBarTodoItem from "./menu_bar_todo_item";
import { SECTIONS_DATA } from "./config";
import { useAtom } from "jotai";

export default function MenuBar() {
  const [todoSections] = useAtom(todoAtom);

  const todoLength = Object.values(todoSections).reduce((acc, section) => acc + section.length, 0);

  return (
    <MenuBarExtra
      icon={{
        source: { light: "command-icon-menubar-light.png", dark: "command-icon-menubar-dark.png" },
      }}
      tooltip="Your Todo List"
    >
      {todoLength > 0 ? (
        <>
          <TodoList sectionKey="pinned" todos={todoSections["pinned"]} />
          <TodoList sectionKey="todo" todos={todoSections["todo"]} />
          <TodoList sectionKey="completed" todos={todoSections["completed"]} />
        </>
      ) : (
        <MenuBarExtra.Item title="No Todos" />
      )}
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
