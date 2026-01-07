import { List, ActionPanel, Action } from "@raycast/api";
import { useState } from "react";
import { useCurrentUser, useMyTasks, useAuthErrorHandler } from "./hooks";
import { TaskListItem, TaskFilterDropdown } from "./components";
import CreateTaskCommand from "./create-task";
import { StatusFilter, TypeFilter, filterTasks, getFilterDescription, sortTasksByCreatedDate } from "./utils";

export default function MyTasksCommand() {
  const { data: currentUser, isLoading: isLoadingUser, error: userError } = useCurrentUser();
  const { data: tasks, isLoading: isLoadingTasks, revalidate } = useMyTasks(currentUser?.id);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  // Handle auth errors
  useAuthErrorHandler(userError);

  const filters = { status: statusFilter, type: typeFilter };
  const filteredTasks = sortTasksByCreatedDate(filterTasks(tasks, filters));

  const isLoading = isLoadingUser || isLoadingTasks;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search my tasks..."
      searchBarAccessory={
        <TaskFilterDropdown
          onFilterChange={(status, type) => {
            setStatusFilter(status);
            setTypeFilter(type);
          }}
        />
      }
    >
      {!isLoading && filteredTasks.length === 0 ? (
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
