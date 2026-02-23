import { Color, Icon } from "@raycast/api";
import { Quest } from "./types";

export function getDifficultyIcon(difficulty: Quest["difficulty"]): Icon {
  switch (difficulty) {
    case "easy":
      return Icon.Circle;
    case "medium":
      return Icon.CircleProgress25;
    case "hard":
      return Icon.CircleProgress50;
    case "epic":
      return Icon.CircleProgress75;
    case "legendary":
      return Icon.CircleProgress100;
    default:
      return Icon.Circle;
  }
}

export function getDifficultyColor(difficulty: Quest["difficulty"]): Color {
  switch (difficulty) {
    case "easy":
      return Color.Green;
    case "medium":
      return Color.Blue;
    case "hard":
      return Color.Orange;
    case "epic":
      return Color.Purple;
    case "legendary":
      return Color.Red;
    default:
      return Color.SecondaryText;
  }
}

export function getStatusIcon(status: Quest["status"]): Icon {
  switch (status) {
    case "todo":
      return Icon.Circle;
    case "doing":
      return Icon.CircleProgress50;
    case "done":
      return Icon.CheckCircle;
    default:
      return Icon.Circle;
  }
}

export function getStatusColor(status: Quest["status"]): Color {
  switch (status) {
    case "todo":
      return Color.SecondaryText;
    case "doing":
      return Color.Yellow;
    case "done":
      return Color.Green;
    default:
      return Color.SecondaryText;
  }
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(date: string | null | undefined, time: string | null | undefined): string {
  if (!date && !time) return "";
  if (date && time) {
    return `${formatDate(date)} at ${time}`;
  }
  if (date) {
    return formatDate(date);
  }
  return "";
}

export function getQuestSubtitle(quest: Quest): string {
  const parts: string[] = [];

  if (quest.space) {
    parts.push(quest.space.name);
  }

  if (quest.journey) {
    parts.push(quest.journey.title);
  }

  const dateTime = formatDateTime(quest.date, quest.time);
  if (dateTime) {
    parts.push(dateTime);
  }

  return parts.join(" • ");
}

export function sortQuests(quests: Quest[]): Quest[] {
  return [...quests].sort((a, b) => {
    if (a.done !== b.done) {
      return a.done ? 1 : -1;
    }

    const statusOrder = { todo: 0, doing: 1, done: 2 };
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;

    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}
