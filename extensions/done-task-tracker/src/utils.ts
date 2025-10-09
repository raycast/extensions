import { LocalStorage } from "@raycast/api";
import { format, parseISO } from "date-fns";

// We'll store tasks in an object where the key is the date (YYYY-MM-DD)
// and the value is an array of task strings.
export interface AllTasks {
  [date: string]: string[];
}

// Function to get all tasks from local storage
export async function getTasks(): Promise<AllTasks> {
  const storedTasks = await LocalStorage.getItem<string>("done-tasks");
  if (!storedTasks) {
    return {};
  }
  return JSON.parse(storedTasks);
}

// Function to save all tasks to local storage
export async function saveTasks(tasks: AllTasks): Promise<void> {
  await LocalStorage.setItem("done-tasks", JSON.stringify(tasks));
}

// Function to add a single task for a specific date
export async function addTask(date: string, task: string): Promise<void> {
  const allTasks = await getTasks();
  if (!allTasks[date]) {
    allTasks[date] = [];
  }
  allTasks[date].unshift(task); // Add to the beginning of the array
  await saveTasks(allTasks);
}

// Function to delete a specific task
export async function deleteTask(date: string, taskIndex: number): Promise<void> {
  const allTasks = await getTasks();
  if (allTasks[date]) {
    allTasks[date].splice(taskIndex, 1);
    // Remove the date entry if no tasks remain
    if (allTasks[date].length === 0) {
      delete allTasks[date];
    }
    await saveTasks(allTasks);
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
    const parsedDate = parseISO(date);
    const formattedDate = format(parsedDate, "yyyy-MM-dd");
    const dayOfWeek = format(parsedDate, "EEEE");

    tasks[date].forEach((task) => {
      lines.push(`${formattedDate}\t${dayOfWeek}\t${task}`);
    });
  });

  return lines.join("\n");
}

// Function to format a single day's tasks for Google Sheets
export function formatDayTasksForGoogleSheets(date: string, tasks: string[]): string {
  const parsedDate = parseISO(date);
  const formattedDate = format(parsedDate, "yyyy-MM-dd");
  const dayOfWeek = format(parsedDate, "EEEE");

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
    const parsedDate = parseISO(date);
    const formattedDate = format(parsedDate, "yyyy-MM-dd");
    const dayOfWeek = format(parsedDate, "EEEE");

    tasks[date].forEach((task) => {
      // Escape task text for CSV (handle commas and quotes)
      const escapedTask = task.includes(",") || task.includes('"') ? `"${task.replace(/"/g, '""')}"` : task;
      lines.push(`${formattedDate},${dayOfWeek},${escapedTask}`);
    });
  });

  return lines.join("\n");
}
