import { Color, Icon, Image } from "@raycast/api";
import { todoSourceId } from "../api/todo-source";
import { TodoGroupType, TodoSourceId } from "../types";
import { isTaskBlockItem, isTodoItem, TaskBlockItem, TodoItem, todoState, TodoState } from "./todoList";

type ProgressPercentageBin = `below${"25" | "50" | "75" | "100" | "150" | "200"}` | "above200";

export const todoGroupIcon: Record<TodoGroupType, Icon> = {
  list: Icon.List,
  area: Icon.Box,
  project: Icon.PieChart,
};

export const todoSourceIcon: Record<TodoSourceId, Image.Source> = {
  [todoSourceId.reminders]: "bullet-points-square.svg",
  [todoSourceId.things]: "things.svg",
  [todoSourceId.todoist]: "todoist.svg",
};

export const taskBlockIcon: Image.Source = { light: "light/square-on-square.svg", dark: "dark/square-on-square.svg" };

export const breakBlockIcon: Image.Source = { light: "light/cup.svg", dark: "dark/cup.svg" };

const todoStateIcon: Record<TodoState, Image> = {
  [todoState.notTimeblocked]: {
    source: { light: "light/square-dotted-small.svg", dark: "dark/square-dotted-small.svg" },
  },
  [todoState.timeblocked]: { source: { light: "light/square-small.svg", dark: "dark/square-small.svg" } },
  [todoState.inProgress]: {
    source: { light: "light/clock-arrow.svg", dark: "dark/clock-arrow.svg" },
    tintColor: Color.Blue,
  },
  [todoState.paused]: {
    source: { light: "light/pause-square-small.svg", dark: "dark/pause-square-small.svg" },
    tintColor: Color.Yellow,
  },
  [todoState.completed]: {
    source: { light: "light/check-square-small.svg", dark: "dark/check-square-small.svg" },
    tintColor: Color.Green,
  },
  [todoState.canceled]: {
    source: { light: "light/xmark-square-small.svg", dark: "dark/xmark-square-small.svg" },
    tintColor: Color.SecondaryText,
  },
};

const percentTrackedIcon: Record<ProgressPercentageBin, Image> = {
  below25: {
    source: { light: "light/stopwatch-0.svg", dark: "dark/stopwatch-0.svg" },
    tintColor: { light: "#F8A300", dark: "#FFC531", adjustContrast: true },
  },
  below50: {
    source: { light: "light/stopwatch-25.svg", dark: "dark/stopwatch-25.svg" },
    tintColor: { light: "#998600", dark: "#F0E056", adjustContrast: true },
  },
  below75: {
    source: { light: "light/stopwatch-50.svg", dark: "dark/stopwatch-50.svg" },
    tintColor: { light: "#578207", dark: "#B7D959", adjustContrast: true },
  },
  below100: {
    source: { light: "light/stopwatch-75.svg", dark: "dark/stopwatch-75.svg" },
    tintColor: { light: "#009910", dark: "#67F056", adjustContrast: true },
  },
  below150: {
    source: { light: "light/stopwatch-100.svg", dark: "dark/stopwatch-100.svg" },
    tintColor: { light: "#129674", dark: "#59D48C", adjustContrast: true },
  },
  below200: {
    source: { light: "light/stopwatch-100.svg", dark: "dark/stopwatch-100.svg" },
    tintColor: { light: "#0C73AD", dark: "#57B0EB", adjustContrast: true },
  },
  above200: {
    source: {
      light: "light/stopwatch-exclamation-mark-filled.svg",
      dark: "dark/stopwatch-exclamation-mark-filled.svg",
    },
    tintColor: { light: "#0B12A3", dark: "#865AD6", adjustContrast: true },
  },
};

export function getTodoListItemIcon(item: TodoItem | TaskBlockItem) {
  if (item.state === todoState.timeblocked) {
    if (isTaskBlockItem(item)) {
      return { source: taskBlockIcon };
    }

    if (!isTodoItem(item)) {
      // BreakBlockItem
      return { source: breakBlockIcon };
    }
  }

  const stateIcon = todoStateIcon[item.state];
  return stateIcon.tintColor || isTaskBlockItem(item)
    ? stateIcon
    : { source: stateIcon.source, tintColor: item.priority?.color };
}

export function getPercentTrackedIcon(percentTracked: number): Image {
  const divisor = percentTracked < 100 ? 25 : 50;
  const rounded = (Math.floor(percentTracked / divisor) + 1) * divisor;
  const key = `below${rounded}` as ProgressPercentageBin;
  return key in percentTrackedIcon ? percentTrackedIcon[key] : percentTrackedIcon.above200;
}
