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
    return base.clone();
  }

  if (repeat === "yearly") {
    const baseMonth = base.month();
    const baseDay = base.date();
    // Set day to 1 first to avoid month overflow when base day exceeds target month's days (e.g. Jan 31 -> Feb)
    let next = moment({ year: today.year(), month: baseMonth, day: 1 });
    next = next.date(Math.min(baseDay, next.daysInMonth()));
    if (next.isBefore(today)) {
      next = moment({ year: today.year() + 1, month: baseMonth, day: 1 });
      next = next.date(Math.min(baseDay, next.daysInMonth()));
    }
    return next.clone();
  }

  if (repeat === "monthly") {
    const baseDay = base.date();
    let next = moment({ year: today.year(), month: today.month(), day: 1 });
    next = next.date(Math.min(baseDay, next.daysInMonth()));
    if (next.isBefore(today)) {
      next = today.clone().startOf("month").add(1, "month");
      next = next.date(Math.min(baseDay, next.daysInMonth()));
    }
    return next.clone();
  }

  if (repeat === "weekly") {
    const baseDay = base.day();
    let next = today.clone().day(baseDay);
    if (next.isBefore(today)) {
      next = next.add(1, "week");
    }
    return next.clone();
  }

  return base.clone();
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
