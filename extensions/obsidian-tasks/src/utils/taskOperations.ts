import fs from "fs-extra";
import { showToast, Toast } from "@raycast/api";
import { Task, Priority } from "../types";
import { readTasksFile } from "./fileUtils";
import { formatTask, removeSpecialCharacters } from "./taskFormatter";
import { priorityToValue } from "./priority";
import { refreshMenubar } from "./menubarRefresh";

export const getAllTasks = async (): Promise<Task[]> => {
  const taskFile = await readTasksFile();
  return taskFile.tasks;
};

export const getAllUncompletedTasks = async (): Promise<Task[]> => {
  const tasks = await getAllTasks();
  return tasks.filter((task) => !task.completed);
};

export const getHighestPriorityTask = async (): Promise<Task | null> => {
  try {
    const tasks = await getAllUncompletedTasks();

    if (tasks.length === 0) {
      return null;
    }

    // Sort tasks by priority
    const sortedTasks = [...tasks].sort((a, b) => {
      // First sort by priority (high to low)
      const priorityA = a.priority || Priority.LOWEST;
      const priorityB = b.priority || Priority.LOWEST;
      const priorityDiff = priorityToValue(priorityA) - priorityToValue(priorityB);

      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      // If priorities are equal, sort by due date (closest first)
      if (a.dueDate && b.dueDate) {
        return a.dueDate.getTime() - b.dueDate.getTime();
      } else if (a.dueDate) {
        return -1;
      } else if (b.dueDate) {
        return 1;
      }

      // If no due dates or priorities, sort by scheduled date
      if (a.scheduledDate && b.scheduledDate) {
        return a.scheduledDate.getTime() - b.scheduledDate.getTime();
      } else if (a.scheduledDate) {
        return -1;
      } else if (b.scheduledDate) {
        return 1;
      }

      // If still equal, sort by start date
      if (a.startDate && b.startDate) {
        return a.startDate.getTime() - b.startDate.getTime();
      } else if (a.startDate) {
        return -1;
      } else if (b.startDate) {
        return 1;
      }

      // If everything else is equal, sort by creation time
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    return sortedTasks[0];
  } catch (error) {
    console.error("Error getting highest priority task:", error);
    return null;
  }
};

export const addTask = async (
  task: Omit<Task, "id" | "createdAt" | "line" | "filePath" | "indentation">
): Promise<Task> => {
  try {
    const taskFile = await readTasksFile();
    const lines = taskFile.content.split("\n");

    // Create a new task with missing fields
    const newTask: Task = {
      ...task,
      id: String(lines.length),
      createdAt: new Date(),
      line: lines.length,
      filePath: taskFile.path,
      indentation: "", // Default indentation
    };

    const taskText = formatTask(newTask);

    lines.push(taskText);

    await fs.writeFile(taskFile.path, lines.join("\n"), "utf-8");

    await showToast({
      style: Toast.Style.Success,
      title: "Task added",
    });

    await refreshMenubar();

    return newTask;
  } catch (error) {
    console.error("Error adding task:", error);

    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to add task",
      message: String(error),
    });

    throw error;
  }
};

export const updateTask = async (task: Task): Promise<Task> => {
  try {
    task.description = removeSpecialCharacters(task.description);

    const taskFile = await readTasksFile();
    const lines = taskFile.content.split("\n");

    lines[task.line] = formatTask(task);

    await fs.writeFile(taskFile.path, lines.join("\n"), "utf-8");

    await refreshMenubar();

    return task;
  } catch (error) {
    console.error("Error updating task:", error);
    throw error;
  }
};

export const markTaskDone = async (task: Task): Promise<Task> => {
  const updatedTask = { ...task, completed: true, completedAt: new Date() };
  const result = await updateTask(updatedTask);

  await refreshMenubar();

  return result;
};

export const markTaskUndone = async (task: Task): Promise<Task> => {
  const updatedTask = { ...task, completed: false, completedAt: undefined };
  const result = await updateTask(updatedTask);

  await refreshMenubar();

  return result;
};

export const deleteTask = async (task: Task): Promise<void> => {
  try {
    const taskFile = await readTasksFile();
    const lines = taskFile.content.split("\n");

    lines.splice(task.line, 1);

    await fs.writeFile(taskFile.path, lines.join("\n"), "utf-8");

    await refreshMenubar();
  } catch (error) {
    console.error("Error deleting task:", error);
    throw error;
  }
};
