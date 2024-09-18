import { TodoItem, TodoSections } from "./atoms";
import { setTimeout } from "timers/promises";

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

  return (
    <MenuBarExtra.Item
      onAction={async () => {
        toggleTodo();
        await setTimeout(1);
      }}
      title={`${item.completed ? "✓" : "○"}  ${item.title}`}
    />
  );
}
