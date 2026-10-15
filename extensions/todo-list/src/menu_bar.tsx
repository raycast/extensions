import { TodoItem, TodoSections, todoAtom } from "./atoms";
import { Keyboard, launchCommand, LaunchType, MenuBarExtra } from "@raycast/api";
import MenuBarTodoItem from "./menu_bar_todo_item";
import { SECTIONS_DATA, preferences } from "./config";
import { useAtom } from "jotai";
import { sortTodoItem } from "./utils";
import { showFailureToast } from "@raycast/utils";

const CompletedLimit: { [key: string]: number | undefined } = {
  latest: 3,
  show_all: undefined,
  hide_all: 0,
};

export default function MenuBar() {
  const [todoSections] = useAtom(todoAtom);

  const todoLength = Object.values(todoSections).reduce((acc, section) => acc + section.length, 0);
  const completedLimit = CompletedLimit[preferences.completed];

  return (
    <MenuBarExtra
      icon={{
        source: { light: "command-icon-menubar-light.png", dark: "command-icon-menubar-dark.png" },
      }}
      tooltip="Your Todo List"
    >
      <MenuBarExtra.Item
        title="Add Todo"
        shortcut={Keyboard.Shortcut.Common.New}
        onAction={async () => {
          try {
            await launchCommand({ name: "index", type: LaunchType.UserInitiated });
          } catch (error) {
            await showFailureToast(error, { title: "Could Not Open Todo List" });
          }
        }}
      />
      {todoLength > 0 ? (
        <>
          <TodoList sectionKey="pinned" todos={todoSections["pinned"]} />
          <TodoList sectionKey="todo" todos={todoSections["todo"]} />
          <TodoList limit={completedLimit} sectionKey="completed" todos={todoSections["completed"]} />
        </>
      ) : (
        <MenuBarExtra.Item title="No Todos" />
      )}
    </MenuBarExtra>
  );
}

const TodoList = ({
  sectionKey,
  todos,
  limit,
}: {
  sectionKey: keyof TodoSections;
  todos: TodoItem[];
  limit?: number;
}) => {
  if (todos.length === 0 || limit === 0) return null;

  const visibleTodos = todos
    .map((item, idx) => ({ item, idx }))
    .sort((a, b) => sortTodoItem(a.item, b.item))
    .slice(0, limit);

  return (
    <>
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item title={SECTIONS_DATA[sectionKey].name} />
      {visibleTodos.map(({ item: todo, idx }) => (
        <MenuBarTodoItem idx={idx} item={todo} key={idx} sectionKey={sectionKey} />
      ))}
    </>
  );
};
