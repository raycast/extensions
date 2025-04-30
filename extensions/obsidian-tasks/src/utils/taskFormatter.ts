import { Task, Priority } from "../types";
import { ICON_REGEX, ICONS } from "../constants";
import { priorityToEmoji } from "./priority";

export const getPriorityMarker = (priority: Priority | undefined): string => {
  return priority ? priorityToEmoji(priority) + " " : "";
};

export const getDueDateMarker = (dueDate: Date): string => {
  return `${ICONS.DATE.DUE} ${dueDate.toISOString().split("T")[0]}`;
};

export const getScheduledDateMarker = (scheduledDate: Date): string => {
  return `${ICONS.DATE.SCHEDULED} ${scheduledDate.toISOString().split("T")[0]}`;
};

export const getStartDateMarker = (startDate: Date): string => {
  return `${ICONS.DATE.START} ${startDate.toISOString().split("T")[0]}`;
};

export const getRecurrenceMarker = (recurrence: string): string => {
  return `${ICONS.RECURRING} ${recurrence}`;
};

export const getCompletionDateMarker = (completedAt: Date): string => {
  return `${ICONS.DATE.COMPLETION} ${completedAt.toISOString().split("T")[0]}`;
};

export const formatTask = (task: Task): string => {
  try {
    let taskText = `${task.indentation}- [${task.completed ? "x" : " "}] `;

    if (task.priority) {
      taskText += getPriorityMarker(task.priority);
    }

    taskText += task.description.trim();

    const cleanDescription = task.description;

    // Add a space before adding any markers if there isn't one already
    const ensureSpace = (text: string) => {
      return text.endsWith(" ") ? text : text + " ";
    };

    if (task.dueDate && !cleanDescription.includes(ICONS.DATE.DUE)) {
      taskText = ensureSpace(taskText) + getDueDateMarker(task.dueDate);
    }

    if (task.scheduledDate && !cleanDescription.includes(ICONS.DATE.SCHEDULED)) {
      taskText = ensureSpace(taskText) + getScheduledDateMarker(task.scheduledDate);
    }

    if (task.startDate && !cleanDescription.includes(ICONS.DATE.START)) {
      taskText = ensureSpace(taskText) + getStartDateMarker(task.startDate);
    }

    if (task.recurrence && !cleanDescription.includes(ICONS.RECURRING)) {
      taskText = ensureSpace(taskText) + getRecurrenceMarker(task.recurrence);
    }

    if (task.completed && task.completedAt && !cleanDescription.includes(ICONS.DATE.COMPLETION)) {
      taskText = ensureSpace(taskText) + getCompletionDateMarker(task.completedAt);
    }

    return taskText;
  } catch (error) {
    console.error("Error formatting task:", error);
    return `${task.indentation}- [${task.completed ? "x" : " "}] ${task.description}`;
  }
};

export const removeSpecialCharacters = (text: string): string => {
  // remove all special characters from text
  let newText = text;
  Object.values(ICON_REGEX).forEach((regex) => {
    // Create a new RegExp with the global flag
    const globalRegex = new RegExp(regex.source, "g");
    newText = newText.replace(globalRegex, "");
  });

  // Clean up any extra whitespace that might be left behind
  newText = newText.replace(/\s+/g, " ").trim();

  return newText;
};
