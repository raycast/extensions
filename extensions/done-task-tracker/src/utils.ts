import { LocalStorage } from "@raycast/api";

// Date utility functions to replace date-fns
function formatDate(date: Date, format: string): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  switch (format) {
    case "yyyy-MM-dd":
      return `${year}-${month}-${day}`;
    case "EEEE, MMMM d, yyyy":
      return `${dayNames[date.getDay()]}, ${monthNames[date.getMonth()]} ${date.getDate()}, ${year}`;
    case "MMMM d, yyyy":
      return `${monthNames[date.getMonth()]} ${date.getDate()}, ${year}`;
    case "EEEE":
      return dayNames[date.getDay()];
    default:
      return date.toISOString();
  }
}

function parseISODate(dateString: string): Date {
  return new Date(dateString + "T00:00:00.000Z");
}

// We'll store tasks in an object where the key is the date (YYYY-MM-DD)
// and the value is an array of task strings.
export interface AllTasks {
  [date: string]: string[];
}

// Function to validate tasks data structure
function isValidTasksData(data: unknown): data is AllTasks {
  if (!data || typeof data !== "object") return false;

  for (const [key, value] of Object.entries(data)) {
    // Check if key is a valid date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;

    // Check if value is an array of strings
    if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) return false;
  }

  return true;
}

// Function to get all tasks from local storage
export async function getTasks(): Promise<AllTasks> {
  try {
    const storedTasks = await LocalStorage.getItem<string>("done-tasks");
    if (!storedTasks) {
      return {};
    }

    const parsed = JSON.parse(storedTasks);

    // Validate the data structure
    if (!isValidTasksData(parsed)) {
      console.warn("Invalid tasks data found in storage, resetting to empty");
      await LocalStorage.removeItem("done-tasks");
      return {};
    }

    return parsed;
  } catch (error) {
    console.error("Failed to parse tasks from storage:", error);
    // If data is corrupted, reset to empty
    await LocalStorage.removeItem("done-tasks");
    return {};
  }
}

// Function to save all tasks to local storage
export async function saveTasks(tasks: AllTasks): Promise<void> {
  try {
    // Validate before saving
    if (!isValidTasksData(tasks)) {
      throw new Error("Invalid tasks data structure");
    }

    await LocalStorage.setItem("done-tasks", JSON.stringify(tasks));
  } catch (error) {
    if (error instanceof Error && error.message.includes("quota")) {
      throw new Error("Storage quota exceeded. Please delete some tasks to free up space.");
    }
    throw error;
  }
}

// Function to add a single task for a specific date
export async function addTask(date: string, task: string): Promise<void> {
  // Validate inputs
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Invalid date format. Expected YYYY-MM-DD");
  }

  if (!task || typeof task !== "string" || task.trim().length === 0) {
    throw new Error("Task must be a non-empty string");
  }

  const trimmedTask = task.trim();
  if (trimmedTask.length > 1000) {
    throw new Error("Task is too long. Maximum length is 1000 characters");
  }

  try {
    const allTasks = await getTasks();
    if (!allTasks[date]) {
      allTasks[date] = [];
    }
    allTasks[date].unshift(trimmedTask); // Add to the beginning of the array
    await saveTasks(allTasks);
  } catch (error) {
    throw new Error(`Failed to add task: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Function to delete a specific task
export async function deleteTask(date: string, taskIndex: number): Promise<void> {
  // Validate inputs
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Invalid date format. Expected YYYY-MM-DD");
  }

  if (typeof taskIndex !== "number" || taskIndex < 0 || !Number.isInteger(taskIndex)) {
    throw new Error("Task index must be a non-negative integer");
  }

  try {
    const allTasks = await getTasks();

    if (!allTasks[date]) {
      throw new Error("No tasks found for the specified date");
    }

    if (taskIndex >= allTasks[date].length) {
      throw new Error("Task index is out of range");
    }

    allTasks[date].splice(taskIndex, 1);

    // Remove the date entry if no tasks remain
    if (allTasks[date].length === 0) {
      delete allTasks[date];
    }

    await saveTasks(allTasks);
  } catch (error) {
    throw new Error(`Failed to delete task: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Function to format tasks for Google Sheets (tab-separated with headers)
// This creates a format that can be directly pasted into Google Sheets
export function formatTasksForGoogleSheets(tasks: AllTasks): string {
  const sortedDates = Object.keys(tasks).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  // Create header row
  const lines: string[] = ["Date\tDay\tTask"];

  // Add each task as a row with date, day of week, and task description
  sortedDates.forEach((date) => {
    const parsedDate = parseISODate(date);
    const formattedDate = formatDate(parsedDate, "yyyy-MM-dd");
    const dayOfWeek = formatDate(parsedDate, "EEEE");

    tasks[date].forEach((task) => {
      lines.push(`${formattedDate}\t${dayOfWeek}\t${task}`);
    });
  });

  return lines.join("\n");
}

// Function to format a single day's tasks for Google Sheets
export function formatDayTasksForGoogleSheets(date: string, tasks: string[]): string {
  const parsedDate = parseISODate(date);
  const formattedDate = formatDate(parsedDate, "yyyy-MM-dd");
  const dayOfWeek = formatDate(parsedDate, "EEEE");

  // Create header row
  const lines: string[] = ["Date\tDay\tTask"];

  // Add each task as a row
  tasks.forEach((task) => {
    lines.push(`${formattedDate}\t${dayOfWeek}\t${task}`);
  });

  return lines.join("\n");
}

// Function to export tasks as CSV format (alternative to tab-separated)
export function formatTasksAsCSV(tasks: AllTasks): string {
  const sortedDates = Object.keys(tasks).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  // Create header row
  const lines: string[] = ["Date,Day,Task"];

  // Add each task as a row
  sortedDates.forEach((date) => {
    const parsedDate = parseISODate(date);
    const formattedDate = formatDate(parsedDate, "yyyy-MM-dd");
    const dayOfWeek = formatDate(parsedDate, "EEEE");

    tasks[date].forEach((task) => {
      // Escape task text for CSV (handle commas and quotes)
      const escapedTask = task.includes(",") || task.includes('"') ? `"${task.replace(/"/g, '""')}"` : task;
      lines.push(`${formattedDate},${dayOfWeek},${escapedTask}`);
    });
  });

  return lines.join("\n");
}
