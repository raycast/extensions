import { popToRoot } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { api } from "./lib/api";
import type { Workspace } from "./lib/types";
import { TaskForm } from "./components/task-form";

export default function AddTask() {
  const { data: workspaces } = useCachedPromise(
    () => api<Workspace[]>("/api/workspaces"),
    [],
    { initialData: [] },
  );

  return <TaskForm workspaces={workspaces} onSaved={() => popToRoot()} />;
}
