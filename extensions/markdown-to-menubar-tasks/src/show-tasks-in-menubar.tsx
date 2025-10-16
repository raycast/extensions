import { useEffect, useState } from "react";
import { Icon, MenuBarExtra, showToast, Toast } from "@raycast/api";
import { fetchTasks, updateTaskInFile, type Task, type TaskSection } from "./services/markdown";
import { TasksSection } from "./components/TasksSection";

export default function Command() {
  const [sections, setSections] = useState<TaskSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const taskSections = await fetchTasks();
        setSections(taskSections);
      } catch (error) {
        console.error("Error loading tasks:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load tasks",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadTasks();
  }, []);

  const handleTaskClick = async (task: Task) => {
    try {
      const newStatus = !task.isCompleted;
      await updateTaskInFile(task.text, newStatus);

      // Refresh tasks
      const updatedSections = await fetchTasks();
      setSections(updatedSections);
    } catch (error) {
      console.error("Error handling task:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update task",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <MenuBarExtra icon={Icon.CheckList} isLoading={isLoading} tooltip="Markdown Tasks">
      <TasksSection sections={sections} isLoading={isLoading} onTaskClick={handleTaskClick} />
    </MenuBarExtra>
  );
}
