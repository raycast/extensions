import { Icon, List } from "@raycast/api";
import { useMemo } from "react";
import {
  activeSourceIds,
  primaryTodoSourceId,
  primaryTodoSourceTodayList,
  todoLists,
  todoSourceApplicationName,
} from "../api/todo-source";
import { TodoSourceId, UniversalListKey } from "../types";

interface TodoList {
  sourceId?: TodoSourceId;
  id: UniversalListKey | string;
  title: string;
  isToday?: boolean;
}

export const universalList = {
  today: { id: "today", title: "Today", icon: Icon.Star, isToday: true },
  upcoming: {
    id: "upcoming",
    title: "Upcoming",
    icon: { light: "light/calendar-alt.svg", dark: "dark/calendar-alt.svg" },
    isToday: false,
  },
} as const;

export const initialList: TodoList =
  activeSourceIds.length > 1 ? universalList.today : { sourceId: primaryTodoSourceId, ...primaryTodoSourceTodayList };

export default function TodoListDropdown({
  list,
  setList,
}: {
  list: TodoList;
  setList: (newValue: TodoList) => void;
}): JSX.Element {
  const stringifiedList = useMemo(() => {
    const standardizedList: TodoList = {
      sourceId: list.sourceId,
      id: list.id,
      title: list.title,
      isToday: list.isToday,
    };
    return JSON.stringify(standardizedList);
  }, [list]);

  function updateList(selectedItemValue: string): void {
    const newList = JSON.parse(selectedItemValue) as TodoList;
    setList(newList);
  }

  return (
    <List.Dropdown tooltip="Select a to-do list" value={stringifiedList} onChange={updateList}>
      {todoLists.size > 1 ? (
        <List.Dropdown.Section title="All Sources">
          {Object.entries(universalList).map(([key, { id, title, icon, isToday }]) => (
            <List.Dropdown.Item
              key={key}
              icon={{ source: icon }}
              title={title}
              value={JSON.stringify({ id, title, isToday })}
            />
          ))}
        </List.Dropdown.Section>
      ) : null}

      {Array.from(todoLists).map(([sourceId, lists]) => (
        <List.Dropdown.Section key={sourceId} title={todoSourceApplicationName[sourceId]}>
          {lists.map(({ id, title, icon, isToday }) => (
            <List.Dropdown.Item
              key={sourceId + id}
              icon={icon ? { source: icon } : undefined}
              value={JSON.stringify({ sourceId, id, title, isToday })}
              title={title}
            />
          ))}
        </List.Dropdown.Section>
      ))}
    </List.Dropdown>
  );
}
