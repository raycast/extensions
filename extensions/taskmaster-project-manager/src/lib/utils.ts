/**
 * TaskMaster Utilities - Enhanced file reading functions with robust error handling
 */

import * as fs from "fs/promises";
import * as path from "path";
import { TaskData, Task, TaskStatus, Subtask } from "../types/task";

/**
 * Debug helper to log path information
 */
function debugPath(projectRoot: string) {
  console.log(`Debug path info:`);
  console.log(`  Original path: "${projectRoot}"`);
  console.log(`  Path type: ${typeof projectRoot}`);
  console.log(`  Path length: ${projectRoot?.length || 0}`);
  console.log(`  HOME: ${process.env.HOME || "undefined"}`);

  if (projectRoot) {
    const cleanedPath = projectRoot
      .replace(/\/+$/, "")
      .replace(/^~/, process.env.HOME || "");
    console.log(`  Cleaned path: "${cleanedPath}"`);
    console.log(
      `  .taskmaster path: "${path.join(cleanedPath, ".taskmaster")}"`,
    );
    console.log(
      `  tasks.json path: "${path.join(cleanedPath, ".taskmaster", "tasks", "tasks.json")}"`,
    );
  }
}

/**
 * Read tasks directly from .taskmaster/tasks/tasks.json
 */
export async function readTasks(projectRoot: string): Promise<TaskData> {
  try {
    // Debug logging
    debugPath(projectRoot);

    // Validate project root path
    if (!projectRoot || typeof projectRoot !== "string") {
      throw new Error(
        "Project root path is empty or invalid. Please set the project root in Raycast preferences.",
      );
    }

    // Clean up the path (remove trailing slashes, expand ~)
    const cleanedPath = projectRoot
      .replace(/\/+$/, "")
      .replace(/^~/, process.env.HOME || "");

    const tasksFilePath = path.join(
      cleanedPath,
      ".taskmaster",
      "tasks",
      "tasks.json",
    );

    // Check if .taskmaster directory exists
    try {
      const tasksDir = path.join(cleanedPath, ".taskmaster");
      await fs.access(tasksDir);
    } catch {
      throw new Error(
        `TaskMaster directory not found at: ${path.join(cleanedPath, ".taskmaster")}. Please ensure the project root path points to a valid TaskMaster project.`,
      );
    }

    // Check if tasks/tasks.json file exists
    try {
      await fs.access(tasksFilePath);
    } catch {
      throw new Error(
        `tasks.json file not found at: ${tasksFilePath}. Please ensure the TaskMaster project has been initialized with tasks.`,
      );
    }

    const content = await fs.readFile(tasksFilePath, "utf-8");

    if (!content.trim()) {
      throw new Error(
        "tasks.json file is empty. Please ensure the TaskMaster project has valid task data.",
      );
    }

    const data = JSON.parse(content);

    // Handle TaskMaster's JSON structure which can have tasks under tag keys (like "master")
    let tasks: unknown[] = [];
    let currentTag = "main";
    let availableTags = ["main"];

    if (Array.isArray(data)) {
      // Direct array format
      tasks = data;
    } else if (data.tasks && Array.isArray(data.tasks)) {
      // Standard format with tasks array
      tasks = data.tasks;
      currentTag = data.currentTag || data.tag || "main";
      availableTags = data.availableTags || ["main"];
    } else {
      // TaskMaster format with tag-based structure
      const tagKeys = Object.keys(data);
      if (tagKeys.length > 0) {
        // Use the first tag as current, or look for "master"/"main"
        const masterKey =
          tagKeys.find((key) => key === "master" || key === "main") ||
          tagKeys[0];
        currentTag = masterKey;
        availableTags = tagKeys;

        if (data[masterKey] && Array.isArray(data[masterKey].tasks)) {
          tasks = data[masterKey].tasks;
        }
      }
    }

    console.log(`Parsed ${tasks.length} tasks from TaskMaster data`);

    return {
      tasks: tasks.map((task) =>
        transformTaskFromFile(task as Record<string, unknown>),
      ),
      currentTag,
      availableTags,
    };
  } catch (error) {
    if (error instanceof Error) {
      // Re-throw our custom error messages
      if (
        error.message.includes("TaskMaster directory not found") ||
        error.message.includes("tasks.json file not found") ||
        error.message.includes("Project root path is empty") ||
        error.message.includes("tasks.json file is empty")
      ) {
        throw error;
      }

      if (error.message.includes("ENOENT")) {
        throw new Error(
          `File or directory not found. Please check that the project root path is correct: ${projectRoot}`,
        );
      }
      if (
        error.message.includes("Unexpected token") ||
        error.message.includes("JSON")
      ) {
        throw new Error(
          "Invalid tasks.json file. Please check the JSON syntax and ensure the file contains valid TaskMaster data.",
        );
      }
      if (error.message.includes("EACCES")) {
        throw new Error(
          "Permission denied. Please ensure Raycast has permission to access the project directory.",
        );
      }
    }
    throw new Error(
      `Failed to read TaskMaster data: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Get the next available task based on dependencies and priority
 */
export function getNextTask(tasks: Task[]): Task | null {
  // Find available tasks (pending with no blocking dependencies)
  const availableTasks = tasks.filter((task) => {
    if (task.status !== "pending") return false;

    // Check if all dependencies are completed
    if (task.dependencies && task.dependencies.length > 0) {
      const dependencyTasks = tasks.filter((t) =>
        task.dependencies!.includes(t.id),
      );
      const incompleteDependencies = dependencyTasks.filter(
        (t) => t.status !== "done",
      );
      return incompleteDependencies.length === 0;
    }

    return true;
  });

  // Sort by priority then by complexity
  availableTasks.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;

    return (a.complexityScore || 0) - (b.complexityScore || 0);
  });

  return availableTasks.length > 0 ? availableTasks[0] : null;
}

/**
 * Transform task data from file format to our Task interface
 */
function transformTaskFromFile(fileTask: Record<string, unknown>): Task {
  return {
    id: String(fileTask.id || ""),
    title: String(fileTask.title || "Untitled Task"),
    description: String(fileTask.description || ""),
    status: String(fileTask.status || "pending").toLowerCase() as TaskStatus,
    priority: String(
      fileTask.priority || "medium",
    ).toLowerCase() as Task["priority"],
    details:
      typeof fileTask.details === "string" ? fileTask.details : undefined,
    dependencies: Array.isArray(fileTask.dependencies)
      ? fileTask.dependencies.map(String)
      : [],
    complexityScore:
      typeof fileTask.complexityScore === "number"
        ? fileTask.complexityScore
        : undefined,
    subtasks: Array.isArray(fileTask.subtasks)
      ? fileTask.subtasks.map(
          (subtask: Record<string, unknown>) =>
            ({
              id: typeof subtask.id === "number" ? subtask.id : 0,
              title: String(subtask.title || ""),
              description:
                typeof subtask.description === "string"
                  ? subtask.description
                  : undefined,
              status: String(
                subtask.status || "pending",
              ).toLowerCase() as TaskStatus,
              dependencies: Array.isArray(subtask.dependencies)
                ? subtask.dependencies.map(String)
                : [],
            }) as Subtask,
        )
      : [],
  };
}
