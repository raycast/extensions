import { List } from "@raycast/api";
import type { Task } from "../types.js";
import type { TaskGroup } from "../utils/task.js";
import { TaskListItem } from "./task-list-item.js";

type TaskGroupListProps = {
  isLoading: boolean;
  searchBarPlaceholder: string;
  onSearchTextChange: (text: string) => void;
  taskGroups: TaskGroup[];
  onComplete: (task: Task) => Promise<void>;
  onUpdateChecklistItem: (task: Task, itemIndex: number, status: number) => Promise<void>;
  onRefresh?: () => Promise<void>;
};

export function TaskGroupList({
  isLoading,
  searchBarPlaceholder,
  onSearchTextChange,
  taskGroups,
  onComplete,
  onUpdateChecklistItem,
  onRefresh,
}: TaskGroupListProps) {
  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder={searchBarPlaceholder}
      onSearchTextChange={onSearchTextChange}
      throttle
    >
      {taskGroups.map((group) => (
        <List.Section key={group.key} title={group.title} subtitle={`${group.tasks.length}`}>
          {group.tasks.map((task) => (
            <TaskListItem
              key={`${task.projectId}:${task.id}`}
              task={task}
              onComplete={onComplete}
              onUpdateChecklistItem={onUpdateChecklistItem}
              onRefresh={onRefresh}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
