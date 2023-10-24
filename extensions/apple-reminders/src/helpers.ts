import { Color, Icon } from "@raycast/api";

import { Priority } from "./hooks/useData";

export function getPriorityIcon(priority: Priority) {
  if (priority === "high") {
    return {
      source: Icon.Exclamationmark3,
      tintColor: Color.Red,
    };
  }

  if (priority === "medium") {
    return {
      source: Icon.Exclamationmark2,
      tintColor: Color.Yellow,
    };
  }

  if (priority === "low") {
    return {
      source: Icon.Exclamationmark,
      tintColor: Color.Blue,
    };
  }

  return undefined;
}

export function truncateMiddle(str: string, maxLength = 45): string {
  if (str.length <= maxLength) {
    return str;
  }

  const startIndex = Math.ceil(maxLength / 2) - 2;
  const endIndex = str.length - (maxLength - startIndex - 3);

  return str.substring(0, startIndex) + "…" + str.substring(endIndex);
}
