import { useState } from "react";
import { Action, ActionPanel, Color, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { AuthError as AuthErrorComponent } from "./components/AuthError";
import { getTasks, AuthError } from "./api/manus";
import { TaskStatus } from "./api/types";

const PAGE_SIZE = 20;

const STATUS_COLORS: Record<TaskStatus, Color> = {
  pending: Color.Yellow,
  running: Color.Blue,
  completed: Color.Green,
  failed: Color.Red,
};

export default function ListTasks() {
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");

  const { data, isLoading, error, pagination } = useCachedPromise(
    (query: string | undefined, status: TaskStatus[] | undefined) =>
      async (options: { cursor?: string }) => {
        const response = await getTasks({
          query,
          status,
          after: options.cursor,
          limit: PAGE_SIZE,
        });
        return {
          data: response.data ?? [],
          hasMore: response.has_more ?? false,
          cursor: response.last_id ?? undefined,
        };
      },
    [
      searchText || undefined,
      statusFilter === "all" ? undefined : [statusFilter],
    ],
    { keepPreviousData: true },
  );

  if (error instanceof AuthError) {
    return <AuthErrorComponent />;
  }

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      filtering={false}
      throttle={true}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Status"
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as TaskStatus | "all")}
        >
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Pending" value="pending" />
          <List.Dropdown.Item title="Running" value="running" />
          <List.Dropdown.Item title="Completed" value="completed" />
          <List.Dropdown.Item title="Failed" value="failed" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title="No Tasks Found"
        description="Try a different search or filter"
      />
      {data?.map((task) => (
        <List.Item
          key={task.id}
          title={
            task.metadata?.task_title ||
            task.instructions?.slice(0, 50) ||
            task.id
          }
          subtitle={new Date(task.updated_at * 1000).toLocaleString()}
          accessories={[
            { tag: { value: task.status, color: STATUS_COLORS[task.status] } },
          ]}
          actions={
            <ActionPanel>
              {task.metadata?.task_url && (
                <Action.OpenInBrowser url={task.metadata.task_url} />
              )}
              <Action.CopyToClipboard
                title="Copy ID"
                content={task.id}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
