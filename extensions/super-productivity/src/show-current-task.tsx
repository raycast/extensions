import {
  Alert,
  Detail,
  Toast,
  closeMainWindow,
  confirmAlert,
  showToast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo } from "react";
import {
  assertAppReady,
  deleteTask,
  getCurrentTask,
  getStatus,
  listProjects,
  listTags,
} from "./lib/sp-client";
import { getErrorMessage } from "./lib/sp-errors";
import { SpProject, SpTag, SpTask } from "./lib/sp-models";
import { SetupDetail } from "./lib/ui";
import { TaskDetailView } from "./components/TaskListView";

interface MutationOptions {
  closeWindow?: boolean;
}

const loadCurrentTaskData = async () => {
  await assertAppReady();
  const [task, status, projects, tags] = await Promise.all([
    getCurrentTask(),
    getStatus(),
    listProjects(),
    listTags(),
  ]);
  return { task, currentTaskId: status.currentTaskId, projects, tags };
};

export default function Command() {
  const { data, error, isLoading, revalidate } =
    usePromise(loadCurrentTaskData);

  const projectById = useMemo(
    () =>
      new Map<string, SpProject>(
        (data?.projects ?? []).map((project) => [project.id, project]),
      ),
    [data?.projects],
  );
  const tagById = useMemo(
    () =>
      new Map<string, SpTag>((data?.tags ?? []).map((tag) => [tag.id, tag])),
    [data?.tags],
  );

  const runMutation = async (
    action: () => Promise<unknown>,
    title: string,
    options: MutationOptions = {},
  ) => {
    try {
      await action();
      await showToast({ style: Toast.Style.Success, title });
      await revalidate();
      if (options.closeWindow) {
        await closeMainWindow({ clearRootSearch: true });
      }
    } catch (mutationError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Action failed",
        message: getErrorMessage(mutationError),
      });
      await revalidate();
    }
  };

  const handleDelete = async (task: SpTask) => {
    const confirmed = await confirmAlert({
      title: `Delete "${task.title}"?`,
      message: "This permanently deletes the task in Super Productivity.",
      primaryAction: {
        title: "Delete Task",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await runMutation(() => deleteTask(task.id), "Task deleted");
    }
  };

  if (error) {
    return <SetupDetail error={error} />;
  }

  if (!data?.task) {
    return (
      <Detail
        isLoading={isLoading}
        markdown={[
          "# No current task",
          "",
          "No task is currently being tracked in Super Productivity.",
        ].join("\n")}
      />
    );
  }

  return (
    <TaskDetailView
      task={data.task}
      currentTaskId={data.currentTaskId}
      projectById={projectById}
      tagById={tagById}
      isArchived={false}
      onDelete={handleDelete}
      onMutate={runMutation}
      onRefresh={revalidate}
    />
  );
}
