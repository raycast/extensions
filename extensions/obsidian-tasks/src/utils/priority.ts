import { Icon, Color } from "@raycast/api";
import { Priority } from "../types";
import { ICONS } from "../constants";

export const priorityToEmoji = (priority: Priority | undefined): string => {
  if (!priority) return "";

  const mapping = {
    [Priority.HIGHEST]: ICONS.PRIORITY.HIGHEST,
    [Priority.HIGH]: ICONS.PRIORITY.HIGH,
    [Priority.MEDIUM]: ICONS.PRIORITY.MEDIUM,
    [Priority.LOW]: ICONS.PRIORITY.LOW,
    [Priority.LOWEST]: ICONS.PRIORITY.LOWEST,
  };

  return mapping[priority] || "";
};

export const emojiToPriority = (emoji: string): Priority | undefined => {
  const mapping = {
    [ICONS.PRIORITY.HIGHEST]: Priority.HIGHEST,
    [ICONS.PRIORITY.HIGH]: Priority.HIGH,
    [ICONS.PRIORITY.MEDIUM]: Priority.MEDIUM,
    [ICONS.PRIORITY.LOW]: Priority.LOW,
    [ICONS.PRIORITY.LOWEST]: Priority.LOWEST,
  };

  return mapping[emoji as keyof typeof mapping];
};

export const priorityToValue = (priority: Priority | undefined): number => {
  if (!priority) return Infinity;

  const values = {
    [Priority.HIGHEST]: 0,
    [Priority.HIGH]: 1,
    [Priority.MEDIUM]: 2,
    [Priority.LOW]: 3,
    [Priority.LOWEST]: 4,
  };

  return values[priority];
};

export const priorityToIcon = (
  priority: Priority | undefined
): { icon: Icon; tintColor: string } => {
  if (!priority) return { icon: Icon.Circle, tintColor: Color.SecondaryText };

  const mapping = {
    [Priority.HIGHEST]: { icon: Icon.ExclamationMark, tintColor: Color.Red },
    [Priority.HIGH]: { icon: Icon.ArrowUp, tintColor: Color.Orange },
    [Priority.MEDIUM]: { icon: Icon.List, tintColor: Color.Yellow },
    [Priority.LOW]: { icon: Icon.ArrowDown, tintColor: Color.Blue },
    [Priority.LOWEST]: { icon: Icon.Minus, tintColor: Color.SecondaryText },
  };

  return mapping[priority];
};
