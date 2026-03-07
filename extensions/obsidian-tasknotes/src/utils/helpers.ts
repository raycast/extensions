import { Color, Icon } from "@raycast/api";
import { Task } from "../types";

export function getPriorityIcon(priority: Task["priority"], exclamation: boolean = false) {
  if (priority === "high") {
    return {
      source: exclamation ? Icon.Exclamationmark3 : Icon.CircleFilled,
      tintColor: Color.Red,
    };
  }

  if (priority === "normal") {
    return {
      source: exclamation ? Icon.Exclamationmark2 : Icon.CircleFilled,
      tintColor: Color.Yellow,
    };
  }

  if (priority === "low") {
    return {
      source: exclamation ? Icon.Exclamationmark : Icon.CircleFilled,
      tintColor: Color.Blue,
    };
  }

  return {
    source: Icon.CircleFilled,
    tintColor: Color.SecondaryText,
  };
}

export function getStatusIcon(status: Task["status"]) {
  if (status === "open") {
    return { source: Icon.Circle, tintColor: Color.PrimaryText };
  }

  if (status === "in-progress") {
    return { source: Icon.CircleProgress, tintColor: Color.Blue };
  }

  if (status === "done") {
    return { source: Icon.CheckCircle, tintColor: Color.Green };
  }

  return { source: Icon.Circle, tintColor: Color.SecondaryText };
}
