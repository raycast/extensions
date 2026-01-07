import { List, ActionPanel, Action } from "@raycast/api";
import { useState } from "react";
import { useCurrentUser, useTasks, useAuthErrorHandler } from "./hooks";
import { TaskListItem, TaskFilterDropdown } from "./components";
import CreateTaskCommand from "./create-task";
import { StatusFilter, TypeFilter, filterTasks, getFilterDescription, sortTasksByCreatedDate } from "./utils";

export default function AllTasksCommand() {
  const { error: userError } = useCurrentUser();
  const { data: tasks, isLoading: isLoadingTasks, revalidate } = useTasks();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  // Handle auth errors
  useAuthErrorHandler(userError);

  const filters = { status: statusFilter, type: typeFilter };
  const filteredTasks = sortTasksByCreatedDate(filterTasks(tasks, filters));

  return (
    <List
      isLoading={isLoadingTasks}
      searchBarPlaceholder="Search all tasks..."
      searchBarAccessory={
        <TaskFilterDropdown
          onFilterChange={(status, type) => {
            setStatusFilter(status);
            setTypeFilter(type);
          }}
        />
      }
    >
      {!isLoadingTasks && filteredTasks.length === 0 ? (
        <List.EmptyView
          title="No tasks found"
          description={getFilterDescription(filters)}
          actions={
            <ActionPanel>
              <Action.Push title="Create Task" target={<CreateTaskCommand />} />
            </ActionPanel>
          }
        />
      ) : (
        filteredTasks.map((task) => <TaskListItem key={task.id} task={task} onStatusChange={revalidate} />)
      )}
    </List>
  );
}
