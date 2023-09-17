import { Color } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";

export function getIcon(progressNumber: number) {
  const icon = getProgressIcon(progressNumber / 100, Color.PrimaryText);
  return icon;
}
