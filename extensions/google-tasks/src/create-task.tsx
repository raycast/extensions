import CreateTaskForm from "./components/CreateTaskForm";
import { createTask } from "./api/endpoints";
import { useCallback } from "react";
import { showToast, Toast } from "@raycast/api";
import { TaskForm } from "./types";

export default function Command() {
  const handleCreate = useCallback(
    (listId: string, taskToCreate: TaskForm) => {
      (async () => {
        try {
          await createTask(listId, taskToCreate);
        } catch (error) {
          console.error(error);
          showToast({ style: Toast.Style.Failure, title: String(error) });
        }
      })();
    },
    [createTask]
  );

  return <CreateTaskForm onCreate={handleCreate} />;
}
