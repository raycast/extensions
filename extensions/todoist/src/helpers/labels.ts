import { Color } from "@raycast/api";

import { Label, Task } from "../api";

import { getColorByKey } from "./colors";
import { sortByDate } from "./sortBy";

export function getLabelUrl(id: string) {
  return `https://todoist.com/app/label/${id}`;
}

export function getLabelAppUrl(name: string) {
  return `todoist://label?name=${name}`;
}

export function getTaskLabels(task: Task, labels: Label[]) {
  return task.labels.map((labelName) => {
    const associatedLabel = labels.find((label) => label.name === labelName);

    // If the label can't be mapped to the user's labels, it means it's a shared label
    // so let's return a minimal label like below
    if (!associatedLabel) {
      return { id: labelName, name: labelName, color: Color.PrimaryText };
    }

    return { ...associatedLabel, color: getColorByKey(associatedLabel.color).value };
  });
}

export function getRemainingLabels(task: Task, labels: Label[]) {
  const taskLabels = getTaskLabels(task, labels);
  return labels
    .filter((label) => !taskLabels.find((taskLabel) => taskLabel?.id === label.id))
    .map((l) => ({ ...l, color: getColorByKey(l.color).value }));
}

export function labelSort(tasks: Task[]) {
  tasks.sort((a, b) => {
    // Sort by priority (highest first)
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }

    // Sort by date
    return sortByDate(a, b);
  });

  return tasks;
}

export function extractLabels(text: string) {
  const matches = text.match(/(?<!\S)@[\w-]+\b/g);
  return matches?.map((match) => match.replace("@", "")) ?? [];
}
