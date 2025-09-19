/**
 * Utilities for writing TaskMaster data back to files with enhanced error handling
 */

import fs from "fs";
import path from "path";
import { showToast, Toast } from "@raycast/api";
import { Task, TaskStatus, TaskPriority } from "../types/task";
import { readTasks } from "./utils";

/**
 * Update a task's status and write back to the TaskMaster project with enhanced error handling
 */
export async function updateTaskStatus(
  projectRoot: string,
  taskId: string,
  newStatus: TaskStatus,
): Promise<void> {
  try {
    // Read current tasks
    const { tasks, currentTag } = await readTasks(projectRoot);

    // Find and update the task
    const task = tasks.find((t) => t.id === taskId);
    if (!task) {
      const errorMessage = `Task ${taskId} not found in project`;
      await showToast({
        style: Toast.Style.Failure,
        title: "Task Not Found",
        message: errorMessage,
      });
      throw new Error(errorMessage);
    }

    // Update the status
    const oldStatus = task.status;
    task.status = newStatus;

    // Write back to file
    await writeTasks(projectRoot, tasks, currentTag);

    // Show success toast
    await showToast({
      style: Toast.Style.Success,
      title: "Task Updated",
      message: `Task ${taskId} status changed from ${oldStatus} to ${newStatus}`,
    });
  } catch (error) {
    const errorMessage = `Failed to update task status: ${error instanceof Error ? error.message : String(error)}`;
    await showToast({
      style: Toast.Style.Failure,
      title: "Update Failed",
      message: errorMessage,
    });
    throw new Error(errorMessage);
  }
}

/**
 * Update a subtask's status and write back to the TaskMaster project with enhanced error handling
 */
export async function updateSubtaskStatus(
  projectRoot: string,
  parentTaskId: string,
  subtaskId: number,
  newStatus: TaskStatus,
): Promise<void> {
  try {
    // Read current tasks
    const { tasks, currentTag } = await readTasks(projectRoot);

    // Find the parent task
    const parentTask = tasks.find((t) => t.id === parentTaskId);
    if (!parentTask) {
      const errorMessage = `Parent task ${parentTaskId} not found`;
      await showToast({
        style: Toast.Style.Failure,
        title: "Parent Task Not Found",
        message: errorMessage,
      });
      throw new Error(errorMessage);
    }

    // Find and update the subtask
    if (!parentTask.subtasks || parentTask.subtasks.length === 0) {
      const errorMessage = `Task ${parentTaskId} has no subtasks`;
      await showToast({
        style: Toast.Style.Failure,
        title: "No Subtasks Found",
        message: errorMessage,
      });
      throw new Error(errorMessage);
    }

    const subtask = parentTask.subtasks.find((s) => s.id === subtaskId);
    if (!subtask) {
      const errorMessage = `Subtask ${subtaskId} not found in task ${parentTaskId}`;
      await showToast({
        style: Toast.Style.Failure,
        title: "Subtask Not Found",
        message: errorMessage,
      });
      throw new Error(errorMessage);
    }

    // Update the subtask status
    const oldStatus = subtask.status;
    subtask.status = newStatus;

    // Write back to file
    await writeTasks(projectRoot, tasks, currentTag);

    // Show success toast
    await showToast({
      style: Toast.Style.Success,
      title: "Subtask Updated",
      message: `Subtask ${parentTaskId}.${subtaskId} status changed from ${oldStatus} to ${newStatus}`,
    });
  } catch (error) {
    const errorMessage = `Failed to update subtask status: ${error instanceof Error ? error.message : String(error)}`;
    await showToast({
      style: Toast.Style.Failure,
      title: "Subtask Update Failed",
      message: errorMessage,
    });
    throw new Error(errorMessage);
  }
}

/**
 * Add a new task to the TaskMaster project with enhanced error handling and validation
 */
export async function addTask(
  projectRoot: string,
  taskData: {
    title: string;
    description: string;
    details?: string;
    priority: TaskPriority;
    status: TaskStatus;
    testStrategy?: string;
    dependencies?: string[];
  },
): Promise<void> {
  try {
    // Validate input data
    if (!taskData.title?.trim()) {
      const errorMessage = "Task title is required";
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Task Data",
        message: errorMessage,
      });
      throw new Error(errorMessage);
    }

    if (!taskData.description?.trim()) {
      const errorMessage = "Task description is required";
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Task Data",
        message: errorMessage,
      });
      throw new Error(errorMessage);
    }

    // Read current tasks
    const { tasks, currentTag } = await readTasks(projectRoot);

    // Generate new task ID (find the highest existing ID and add 1)
    const existingIds = tasks.map((task) => {
      const id = typeof task.id === "string" ? parseInt(task.id, 10) : task.id;
      return isNaN(id) ? 0 : id;
    });
    const newId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;

    // Validate dependencies exist
    if (taskData.dependencies && taskData.dependencies.length > 0) {
      const invalidDeps = taskData.dependencies.filter(
        (depId) => !tasks.find((t) => t.id === depId),
      );
      if (invalidDeps.length > 0) {
        const errorMessage = `Invalid dependencies: ${invalidDeps.join(", ")} not found`;
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid Dependencies",
          message: errorMessage,
        });
        throw new Error(errorMessage);
      }
    }

    // Create new task following TaskMaster structure
    const newTask: Task = {
      id: newId.toString(),
      title: taskData.title.trim(),
      description: taskData.description.trim(),
      status: taskData.status,
      priority: taskData.priority,
      dependencies: taskData.dependencies || [],
      details: taskData.details?.trim(),
      testStrategy: taskData.testStrategy?.trim(),
      subtasks: [],
    };

    // Add to tasks array
    const updatedTasks = [...tasks, newTask];

    // Write back to file
    await writeTasks(projectRoot, updatedTasks, currentTag);

    // Show success toast
    await showToast({
      style: Toast.Style.Success,
      title: "Task Created",
      message: `Task ${newId} "${taskData.title}" has been added to the project`,
    });
  } catch (error) {
    const errorMessage = `Failed to add task: ${error instanceof Error ? error.message : String(error)}`;
    // Only show toast if we haven't already shown one
    if (
      error instanceof Error &&
      !error.message.includes("required") &&
      !error.message.includes("Invalid")
    ) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Task Creation Failed",
        message: errorMessage,
      });
    }
    throw new Error(errorMessage);
  }
}

/**
 * Delete a task from the TaskMaster project with enhanced error handling and validation
 */
export async function deleteTask(
  projectRoot: string,
  taskId: string,
): Promise<void> {
  try {
    // Read current tasks
    const { tasks, currentTag } = await readTasks(projectRoot);

    // Find the task to delete
    const taskIndex = tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) {
      const errorMessage = `Task ${taskId} not found in project`;
      await showToast({
        style: Toast.Style.Failure,
        title: "Task Not Found",
        message: errorMessage,
      });
      throw new Error(errorMessage);
    }

    const taskToDelete = tasks[taskIndex];

    // Check if other tasks depend on this task
    const dependentTasks = tasks.filter(
      (task) => task.dependencies && task.dependencies.includes(taskId),
    );

    if (dependentTasks.length > 0) {
      const dependentTaskIds = dependentTasks.map((t) => t.id).join(", ");
      const errorMessage = `Cannot delete task ${taskId} because tasks ${dependentTaskIds} depend on it`;
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot Delete Task",
        message: errorMessage,
      });
      throw new Error(errorMessage);
    }

    // Remove task from array
    const updatedTasks = tasks.filter((t) => t.id !== taskId);

    // Also remove this task from other tasks' dependencies (cleanup orphaned references)
    updatedTasks.forEach((task) => {
      if (task.dependencies) {
        task.dependencies = task.dependencies.filter(
          (depId) => depId !== taskId,
        );
      }
      if (task.subtasks) {
        task.subtasks.forEach((subtask) => {
          if (subtask.dependencies) {
            subtask.dependencies = subtask.dependencies.filter(
              (depId) => depId.toString() !== taskId,
            );
          }
        });
      }
    });

    // Write back to file
    await writeTasks(projectRoot, updatedTasks, currentTag);

    // Show success toast
    await showToast({
      style: Toast.Style.Success,
      title: "Task Deleted",
      message: `Task ${taskId} "${taskToDelete.title}" has been deleted from the project`,
    });
  } catch (error) {
    const errorMessage = `Failed to delete task: ${error instanceof Error ? error.message : String(error)}`;
    // Only show toast if we haven't already shown one
    if (
      error instanceof Error &&
      !error.message.includes("not found") &&
      !error.message.includes("Cannot delete")
    ) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Task Deletion Failed",
        message: errorMessage,
      });
    }
    throw new Error(errorMessage);
  }
}

/**
 * Write tasks back to the TaskMaster project file with enhanced error handling
 */
async function writeTasks(
  projectRoot: string,
  tasks: Task[],
  currentTag?: string,
): Promise<void> {
  const tasksDir = path.join(projectRoot, ".taskmaster", "tasks");
  const tasksFile = path.join(tasksDir, "tasks.json");

  // Check if tasks directory exists
  if (!fs.existsSync(tasksDir)) {
    const errorMessage = `TaskMaster tasks directory not found: ${tasksDir}`;
    await showToast({
      style: Toast.Style.Failure,
      title: "Directory Not Found",
      message: errorMessage,
    });
    throw new Error(errorMessage);
  }

  // Check if tasks file exists
  if (!fs.existsSync(tasksFile)) {
    const errorMessage = "TaskMaster tasks.json file not found";
    await showToast({
      style: Toast.Style.Failure,
      title: "File Not Found",
      message: errorMessage,
    });
    throw new Error(errorMessage);
  }

  try {
    // Create backup before writing
    const backupFile = path.join(tasksDir, `tasks.json.backup.${Date.now()}`);
    const content = fs.readFileSync(tasksFile, "utf-8");
    fs.writeFileSync(backupFile, content);

    // Parse current file structure to preserve format
    const data = JSON.parse(content);

    // Handle different TaskMaster file formats
    if (Array.isArray(data)) {
      // Simple array format
      fs.writeFileSync(tasksFile, JSON.stringify(tasks, null, 2));
    } else if (data.tasks) {
      // Object with tasks property
      data.tasks = tasks;
      fs.writeFileSync(tasksFile, JSON.stringify(data, null, 2));
    } else {
      // Tag-based format - update the current tag's tasks
      const tag = currentTag || "main";
      if (!data[tag]) {
        data[tag] = { tasks: [] };
      }
      data[tag].tasks = tasks;
      fs.writeFileSync(tasksFile, JSON.stringify(data, null, 2));
    }

    // Clean up old backup files (keep only the 5 most recent)
    const backupFiles = fs
      .readdirSync(tasksDir)
      .filter((file) => file.startsWith("tasks.json.backup."))
      .sort((a, b) => {
        const aTime = parseInt(a.split(".").pop() || "0");
        const bTime = parseInt(b.split(".").pop() || "0");
        return bTime - aTime;
      });

    if (backupFiles.length > 5) {
      backupFiles.slice(5).forEach((file) => {
        try {
          fs.unlinkSync(path.join(tasksDir, file));
        } catch {
          // Ignore cleanup errors
        }
      });
    }
  } catch (error) {
    const errorMessage = `Failed to write tasks file: ${error instanceof Error ? error.message : String(error)}`;
    await showToast({
      style: Toast.Style.Failure,
      title: "File Write Failed",
      message: errorMessage,
    });
    throw new Error(errorMessage);
  }
}
