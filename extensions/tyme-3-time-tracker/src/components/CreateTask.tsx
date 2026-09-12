import { List, closeMainWindow, showHUD } from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { Project, createTask, startTrackingTask } from "../tasks";
import { showErrorHUD } from "../utils";

interface CreateTaskProps {
  project: Project;
  name: string;
}

export function CreateTask({ project, name }: CreateTaskProps) {
  const [isLoading, setIsLoading] = useState(true);
  const hasCreated = useRef(false);

  useEffect(() => {
    async function create() {
      if (hasCreated.current) return;
      hasCreated.current = true;

      try {
        const newTask = await createTask(project.id, name);
        const success = await startTrackingTask(newTask.id);
        if (success) {
          await showHUD(`Started tracking "${newTask.name}"`);
          closeMainWindow();
        } else {
          await showHUD("Failed to start tracking");
          setIsLoading(false);
        }
      } catch (error) {
        await showErrorHUD("creating task", error);
        setIsLoading(false);
      }
    }
    create();
  }, [project.id, name]);

  return <List isLoading={isLoading} searchBarPlaceholder="Creating task..." />;
}
