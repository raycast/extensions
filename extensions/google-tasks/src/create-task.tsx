import { Detail, Toast, showToast } from "@raycast/api";
import { useState, useEffect } from "react";
import CreateTaskForm from "./components/CreateTaskForm";
import * as google from "./api/oauth";
import { createTask } from "./api/endpoints";
import { TaskForm } from "./types";

export default function Command() {
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        await google.authorize();
        setIsLoading(false);
      } catch (error) {
        console.error(error);
        setIsLoading(false);
        showToast({ style: Toast.Style.Failure, title: String(error) });
      }
    })();
  }, []);

  const handleCreate = async (listId: string, task: TaskForm) => {
    try {
      await createTask(listId, task);
    } catch (error) {
      console.error(error);
      showToast({ style: Toast.Style.Failure, title: String(error) });
    }
  };

  if (isLoading) {
    return <Detail isLoading={isLoading} />;
  }

  return <CreateTaskForm onCreate={handleCreate} />;
}
