import { showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { describeApiError, listOpenTasks } from "../api/dida365.js";
import { isMissingApiToken } from "../setup.js";
import type { Task } from "../types.js";

type UseOpenTasksOptions = {
  loadErrorTitle: string;
  filterTasks?: (tasks: Task[]) => Task[];
};

export function useOpenTasks({ loadErrorTitle, filterTasks }: UseOpenTasksOptions) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  async function loadTasks() {
    setIsLoading(true);
    try {
      const loaded = await listOpenTasks();
      setTasks(filterTasks ? filterTasks(loaded) : loaded);
    } catch (error) {
      if (isMissingApiToken(error)) {
        setNeedsSetup(true);
        return;
      }

      await showToast({
        style: Toast.Style.Failure,
        title: loadErrorTitle,
        message: describeApiError(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadTasks();
  }, []);

  return { tasks, setTasks, isLoading, needsSetup, loadTasks };
}
