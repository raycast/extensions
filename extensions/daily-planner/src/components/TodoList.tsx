import { List } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { useState } from "react";
import { formatInterval } from "../helpers/datetime";
import { formatStats, TodoItem, SectionedListItems, TaskBlockItem, isTodoItem } from "../helpers/todoList";
import { Block, CalendarEvent, TimeEntry, TodoGroup, TodoSourceId } from "../types";
import CreateTodoAction from "./CreateTodoAction";
import FloatingRunningTimerSection from "./FloatingRunningTimerSection";
import TodoListEmptyView from "./TodoListEmptyView";
import TodoListItem from "./TodoListItem";

export default function TodoList({
  sectionedListItems,
  listName,
  showSourceIcon,
  isTodayList,
  isLoading,
  tieredTodoGroups,
  todoTags,
  floatingRunningTimeEntry,
  showNoRunningTimeEntrySection,
  revalidateTodos,
  revalidateBlocks,
  revalidateUpcomingEvents,
  revalidateTimeEntries,
  mutateTimeEntries,
  searchBarAccessory,
  getPrimaryActions,
  emptyView,
}: {
  sectionedListItems: SectionedListItems<TodoItem | TaskBlockItem> | undefined;
  listName?: string;
  showSourceIcon: boolean;
  isTodayList: boolean;
  isLoading?: boolean;
  tieredTodoGroups: Map<TodoSourceId, TodoGroup[]> | undefined;
  todoTags: Map<TodoSourceId, Map<string, string>> | undefined;
  floatingRunningTimeEntry?: TimeEntry;
  showNoRunningTimeEntrySection?: boolean;
  revalidateTodos: (sourceId?: TodoSourceId) => Promise<void>;
  revalidateBlocks: () => Promise<Block[]>;
  revalidateUpcomingEvents?: () => Promise<CalendarEvent[]>;
  revalidateTimeEntries?: (() => Promise<TimeEntry[]>) | (() => void);
  mutateTimeEntries?: MutatePromise<TimeEntry[]>;
  searchBarAccessory?: JSX.Element;
  getPrimaryActions: (item: TodoItem | TaskBlockItem, parentBlock?: Block) => JSX.Element;
  emptyView?: JSX.Element;
}): JSX.Element {
  const [searchText, setSearchText] = useState("");

  const getCreateTodoAction = () => (
    <CreateTodoAction
      isFromTodayList={isTodayList}
      tieredTodoGroups={tieredTodoGroups}
      todoTags={todoTags}
      revalidateTodos={revalidateTodos}
      initialTitle={searchText}
      resetList={() => setSearchText("")}
      alsoStartTimer={!!revalidateTimeEntries}
      revalidateTimeEntries={revalidateTimeEntries}
    />
  );

  return (
    <List
      isLoading={isLoading}
      filtering={{ keepSectionOrder: true }}
      searchBarAccessory={searchBarAccessory}
      searchBarPlaceholder="Filter by title, project, area, tag or ID"
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      {emptyView ?? (
        <TodoListEmptyView
          listName={listName}
          searchText={searchText}
          floatingRunningTimeEntry={floatingRunningTimeEntry}
          alsoStartTimer={!!revalidateTimeEntries}
          getCreateTodoAction={getCreateTodoAction}
          revalidateTimeEntries={revalidateTimeEntries}
          mutateTimeEntries={mutateTimeEntries}
        />
      )}

      {sectionedListItems &&
      sectionedListItems.length > 0 &&
      (floatingRunningTimeEntry || showNoRunningTimeEntrySection) ? (
        <FloatingRunningTimerSection
          floatingRunningTimeEntry={floatingRunningTimeEntry}
          revalidateTimeEntries={revalidateTimeEntries}
          mutateTimeEntries={mutateTimeEntries}
        />
      ) : null}

      {sectionedListItems?.map(([sectionKey, todoItems]) => (
        <List.Section
          key={typeof sectionKey === "string" ? sectionKey : sectionKey.id}
          title={typeof sectionKey === "string" ? sectionKey : formatInterval(sectionKey)}
          subtitle={formatStats(todoItems)}
        >
          {todoItems.map((todoItem) => (
            <TodoListItem
              key={todoItem.id}
              isTodayList={isTodayList}
              item={todoItem}
              tieredTodoGroups={isTodoItem(todoItem) ? tieredTodoGroups?.get(todoItem.sourceId) : undefined}
              todoTags={isTodoItem(todoItem) ? todoTags?.get(todoItem.sourceId) : undefined}
              revalidateTodos={revalidateTodos}
              revalidateBlocks={revalidateBlocks}
              revalidateUpcomingEvents={revalidateUpcomingEvents}
              revalidateTimeEntries={revalidateTimeEntries}
              mutateTimeEntries={mutateTimeEntries}
              getPrimaryActions={getPrimaryActions}
              getCreateTodoAction={getCreateTodoAction}
              showSourceIcon={showSourceIcon}
              parentBlock={typeof sectionKey !== "string" ? sectionKey : undefined}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
