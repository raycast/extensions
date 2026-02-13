import { launchCommand, LaunchType, showToast, Toast } from "@raycast/api";
import moment from "moment";
import { Item, RepeatType } from "./types";

export function pluralize(length: number): string {
  return `item${length > 1 ? "s" : ""}`;
}

export function validateItem(item: Item) {
  if (item.name === "") {
    showToast(Toast.Style.Failure, "An error occurred", "Name can not be empty");
    return false;
  }

  if (item.date === null) {
    showToast(Toast.Style.Failure, "An error occurred", "Please select a date");
    return false;
  }

  return true;
}

export async function refreshCommands() {
  try {
    await launchCommand({ name: "menu-bar", type: LaunchType.Background });
  } catch (e) {
    console.error("An error occurred while updating the menu bar", e);
  }
  try {
    await launchCommand({ name: "up-next", type: LaunchType.Background });
  } catch (e) {
    console.error("An error occurred while updating the up-next command", e);
  }
}

export function getNextOccurrence(date: string, repeat?: RepeatType): moment.Moment {
  const base = moment(date);
  const today = moment().startOf("day");

  if (!repeat || repeat === "none") {
    return base;
  }

  if (repeat === "yearly") {
    let next = base.clone().year(today.year());
    if (next.isBefore(today)) {
      next = next.add(1, "year");
    }
    return next;
  }

  if (repeat === "monthly") {
    let next = base.clone().year(today.year()).month(today.month());
    if (next.isBefore(today)) {
      next = next.add(1, "month");
    }
    return next;
  }

  if (repeat === "weekly") {
    const baseDay = base.day();
    let next = today.clone().day(baseDay);
    if (next.isBefore(today)) {
      next = next.add(1, "week");
    }
    return next;
  }

  return base;
}

export function getRepeatLabel(repeat?: RepeatType): string {
  switch (repeat) {
    case "yearly":
      return "Yearly";
    case "monthly":
      return "Monthly";
    case "weekly":
      return "Weekly";
    case "none":
    default:
      return "One-time";
  }
}

export function getEffectiveDate(item: Item): moment.Moment {
  return getNextOccurrence(item.date, item.repeat);
}
