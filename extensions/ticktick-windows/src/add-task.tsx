import { useProjects } from "./hooks/useProjects";
import { TaskForm } from "./components/TaskForm";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useEffect } from "react";
import { Preferences } from "./types";

export default function AddTaskCommand() {
  const { projects, isLoading, error } = useProjects();
  const { defaultProject } = getPreferenceValues<Preferences>();

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load projects",
        message: "Task will be saved to Inbox. " + String(error),
      });
    }
  }, [error]);

  return (
    <TaskForm
      projects={projects}
      defaultProjectId={defaultProject}
      isLoadingProjects={isLoading}
    />
  );
}
