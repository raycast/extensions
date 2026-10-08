import { Task, Priority, PRIORITY_VALUES } from "../types";
import { ICON_REGEX, ICONS, TAGS_REGEX, TASK_REGEX } from "../constants";
import { emojiToPriority } from "./priority";

export const extractTags = (text: string): string[] => {
  const tags: string[] = [];
  let match;

  while ((match = TAGS_REGEX.exec(text)) !== null) {
    tags.push(match[1]);
  }

  return tags;
};

export const getPriorityFromMarker = (text: string): Priority | undefined => {
  const match = text.match(ICON_REGEX.PRIORITY);
  if (!match) return undefined;

  const marker = match[0];
  if (!marker) return undefined;

  return emojiToPriority(marker);
};

export const parseTask = (line: string, lineNumber: number): Task | null => {
  try {
    const match = TASK_REGEX.exec(line);
    if (!match) return null;

    const indentation = match[1];
    const completed = match[2].toLowerCase() === "x";
    const description = match[3];

    // Extract dates
    let dueDate: Date | undefined;
    try {
      const dueDateMatch = description.match(ICON_REGEX.DUE_DATE);
      if (dueDateMatch) {
        dueDate = new Date(dueDateMatch[1]);
        if (isNaN(dueDate.getTime())) {
          dueDate = undefined;
        }
      }
    } catch (error) {
      console.error("Error parsing due date:", error);
      dueDate = undefined;
    }

    let scheduledDate: Date | undefined;
    try {
      const scheduledDateMatch = description.match(ICON_REGEX.SCHEDULED_DATE);
      if (scheduledDateMatch) {
        scheduledDate = new Date(scheduledDateMatch[1]);
        if (isNaN(scheduledDate.getTime())) {
          scheduledDate = undefined;
        }
      }
    } catch (error) {
      console.error("Error parsing scheduled date:", error);
      scheduledDate = undefined;
    }

    let startDate: Date | undefined;
    try {
      const startDateMatch = description.match(ICON_REGEX.START_DATE);
      if (startDateMatch) {
        startDate = new Date(startDateMatch[1]);
        if (isNaN(startDate.getTime())) {
          startDate = undefined;
        }
      }
    } catch (error) {
      console.error("Error parsing start date:", error);
      startDate = undefined;
    }

    let completionDate: Date | undefined;
    try {
      const completionDateMatch = description.match(ICON_REGEX.COMPLETION_DATE);
      if (completionDateMatch) {
        completionDate = new Date(completionDateMatch[1]);
        if (isNaN(completionDate.getTime())) {
          completionDate = undefined;
        }
      }
    } catch (error) {
      console.error("Error parsing completion date:", error);
      completionDate = undefined;
    }

    let priority: Priority | undefined = undefined;
    try {
      priority = getPriorityFromMarker(description);
    } catch (error) {
      console.error("Error parsing priority:", error);
    }

    let recurrence: string | undefined;
    try {
      const recurringMatch = description.match(ICON_REGEX.RECURRING);
      if (recurringMatch) {
        recurrence = recurringMatch[1].trim();
      }
    } catch (error) {
      console.error("Error parsing recurrence:", error);
      recurrence = undefined;
    }

    let tags: string[] = [];
    try {
      tags = extractTags(description);
    } catch (error) {
      console.error("Error parsing tags:", error);
      tags = [];
    }

    return {
      id: lineNumber.toString(), // use line number as id
      description: description,
      completed,
      dueDate,
      scheduledDate,
      startDate,
      priority,
      tags: tags.length > 0 ? tags : undefined,
      recurrence,
      createdAt: new Date(),
      completedAt: completed ? completionDate || new Date() : undefined,
      line: lineNumber,
      filePath: null, // Will be set by readTasksFile
      indentation,
    };
  } catch (error) {
    console.error(`Error parsing task line ${lineNumber}: "${line}"`, error);
    return null;
  }
};

export const getFormattedDescription = (task: Task, maxLength = 100): string => {
  if (!task) return "";

  let description = task.description;

  const priorityMatch = description.match(ICON_REGEX.PRIORITY);
  if (priorityMatch) {
    description = description.replace(priorityMatch[0], "").trim();
  }

  const dueDateMatch = description.match(ICON_REGEX.DUE_DATE);
  if (dueDateMatch) {
    description = description.replace(dueDateMatch[0], "").trim();
  }

  const scheduledDateMatch = description.match(ICON_REGEX.SCHEDULED_DATE);
  if (scheduledDateMatch) {
    description = description.replace(scheduledDateMatch[0], "").trim();
  }

  const startDateMatch = description.match(ICON_REGEX.START_DATE);
  if (startDateMatch) {
    description = description.replace(startDateMatch[0], "").trim();
  }

  const recurrenceMatch = description.match(ICON_REGEX.RECURRING);
  if (recurrenceMatch) {
    description = description.replace(recurrenceMatch[0], "").trim();
  }

  const completionDateMatch = description.match(ICON_REGEX.COMPLETION_DATE);
  if (completionDateMatch) {
    description = description.replace(completionDateMatch[0], "").trim();
  }

  // Clean up any extra whitespace
  description = description.replace(/\s+/g, " ").trim();

  if (description.length > maxLength) {
    description = description.substring(0, maxLength) + "...";
  }

  return description;
};

// 0 is highest priority, 4 is lowest priority
export const getPriorityValue = (priority: Priority | undefined): number => {
  if (!priority) return Infinity;
  return PRIORITY_VALUES.indexOf(priority);
};

export const getPriorityIcon = (priority: Priority | undefined): string => {
  if (!priority) return "";
  return ICONS.PRIORITY[priority.toUpperCase() as keyof typeof ICONS.PRIORITY];
};
