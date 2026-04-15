/**
 * Shared constants and options for the Raycast extension
 */

import { Color, Icon } from "@raycast/api";
import { TaskCategory, EnergyLevel, TaskStatus } from "./types";

// Priority scale: 4=High, 3=Medium, 2=Low, 1=None
export const PRIORITY_OPTIONS = [
  { value: "4", title: "P4 - High", color: Color.Red, icon: Icon.FullSignal },
  { value: "3", title: "P3 - Medium", color: Color.Yellow, icon: Icon.Signal3 },
  { value: "2", title: "P2 - Low", color: Color.Blue, icon: Icon.Signal1 },
  { value: "1", title: "P1 - None", color: Color.SecondaryText, icon: null },
];

export const CATEGORY_OPTIONS: {
  value: TaskCategory;
  title: string;
  icon: Icon;
}[] = [
  { value: "work", title: "Work", icon: Icon.Folder },
  { value: "personal", title: "Personal", icon: Icon.Person },
  { value: "health", title: "Health", icon: Icon.Heart },
  { value: "finance", title: "Finance", icon: Icon.BankNote },
  { value: "errands", title: "Errands", icon: Icon.Cart },
  { value: "home", title: "Home", icon: Icon.House },
  { value: "long-term", title: "Long-term", icon: Icon.BullsEye },
];

export const ENERGY_OPTIONS: {
  value: EnergyLevel;
  title: string;
  icon: Icon;
  color: Color;
}[] = [
  { value: "low", title: "Low", icon: Icon.Battery, color: Color.Green },
  {
    value: "medium",
    title: "Medium",
    icon: Icon.BatteryCharging,
    color: Color.Yellow,
  },
  { value: "high", title: "High", icon: Icon.Bolt, color: Color.Orange },
];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  active: "Active",
  done: "Done",
  delayed: "Delayed",
  snoozed: "Snoozed",
  waiting: "Waiting",
  cancelled: "Cancelled",
};

export const STATUS_COLORS: Record<TaskStatus, Color> = {
  active: Color.Blue,
  done: Color.Green,
  delayed: Color.Orange,
  snoozed: Color.Purple,
  waiting: Color.Yellow,
  cancelled: Color.SecondaryText,
};
