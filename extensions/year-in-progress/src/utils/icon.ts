import { Color } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";

export function getIcon(progressNum: number) {
  return getProgressIcon(progressNum / 100, Color.PrimaryText);
}
