// src/list-tasks.tsx
import { Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { AuthGate, type AuthedContext } from "./components/AuthGate";
import { RepoDropdown } from "./components/RepoDropdown";
import { TaskListItem } from "./components/TaskListItem";
import { useRepositories } from "./hooks/useRepositories";
import { useTasks } from "./hooks/useTasks";
import type { Repository } from "./api/types";

function ListTasksView({ client, env }: AuthedContext) {
  const [repoId, setRepoId] = useState<string | null>(null);
  const {
    isLoading: tasksLoading,
    data: tasks,
    error: tasksError,
    revalidate,
  } = useTasks(client, repoId);
  const { data: repos } = useRepositories(client);

  const reposById = useMemo(() => {
    const map = new Map<string, Repository>();
    for (const repo of repos ?? []) {
      map.set(repo.id, repo);
    }
    return map;
  }, [repos]);

  return (
    <List
      isLoading={tasksLoading}
      navigationTitle="Niteshift Tasks"
      searchBarPlaceholder="Search tasks by name"
      searchBarAccessory={<RepoDropdown client={client} value={repoId} onChange={setRepoId} />}
    >
      {!tasksLoading && tasksError && (
        <List.EmptyView
          title="Failed to load tasks"
          description={tasksError.message}
          icon={Icon.ExclamationMark}
        />
      )}
      {!tasksLoading && !tasksError && (tasks?.length ?? 0) === 0 && (
        <List.EmptyView
          title="No tasks yet"
          description="Create one with the Run Task command, or in the Niteshift web UI."
        />
      )}
      {tasks?.map((task) => (
        <TaskListItem
          key={task.id}
          task={task}
          repository={task.repositoryId ? reposById.get(task.repositoryId) : undefined}
          client={client}
          env={env}
          onMutate={revalidate}
        />
      ))}
    </List>
  );
}

export default function Command() {
  return <AuthGate>{(ctx) => <ListTasksView {...ctx} />}</AuthGate>;
}
