import { Color, Icon } from "@raycast/api";
import { Task } from "./types";

export function isCompleted(task: Task): boolean {
  return task.status === "completed";
}

export function getChildren(parent: Task, tasks: Task[]): Task[] {
  return tasks.filter((task) => task.parent === parent.id);
}

export function getIdNames(tasks: Task[]): { [key: string]: string } {
  return tasks.reduce(
    (acc, task) => {
      acc[task.id] = task.title;
      return acc;
    },
    {} as { [key: string]: string },
  );
}

export function getIcon(task: Task): { source: Icon; tintColor?: Color } {
  const due_date = task.due === undefined ? new Date() : new Date(task.due);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Due
  if (!isCompleted(task) && due_date < today) {
    return { source: Icon.Circle, tintColor: Color.Red };
  }
  // Completed
  else if (isCompleted(task)) {
    return { source: Icon.Checkmark, tintColor: Color.Green };
  }
  // Uncomplete
  else {
    return { source: Icon.Circle };
  }
}
