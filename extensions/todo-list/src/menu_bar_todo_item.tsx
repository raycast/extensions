import { TodoItem, TodoSections } from "./atoms";

import { MenuBarExtra } from "@raycast/api";
import { useTodo } from "./hooks/useTodo";

export default function MenuBarTodoItem({
  item,
  idx,
  sectionKey,
}: {
  item: TodoItem;
  idx: number;
  sectionKey: keyof TodoSections;
}) {
  const { toggleTodo } = useTodo({ item, idx, sectionKey });

  return <MenuBarExtra.Item title={`${item.completed ? "✓" : "○"}  ${item.title}`} onAction={() => toggleTodo()} />;
}
