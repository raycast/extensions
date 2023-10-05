import { Color } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";

export function getIcon(progressNumber: number) {
  return getProgressIcon(progressNumber / 100, Color.PrimaryText);
}
