import { Color, Icon } from "@raycast/api";
import { Task } from "./types";

export function isCompleted(task: Task): boolean {
  if (task.status === "completed") {
    return true;
  } else {
    return false;
  }
}

export function getChildren(parent: Task, tasks: Task[]): Task[] {
  const children: Task[] = tasks.filter(function (task) {
    return task.parent == parent.id;
  });
  return children;
}

export function getIdNames(tasks: Task[]): { [key: string]: string } {
  const id_names: { [key: string]: string } = {};
  for (let index = 0; index < tasks.length; index++) {
    const element = tasks[index];
    id_names[element.id] = element.title;
  }
  return id_names;
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
