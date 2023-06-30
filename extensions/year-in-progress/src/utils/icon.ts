import { Icon } from "@raycast/api";

export function getIcon(progressNumber: number) {
  if (progressNumber >= 0 && progressNumber <= 25) {
    return Icon.Circle;
  } else if (progressNumber > 25 && progressNumber <= 50) {
    return Icon.CircleProgress25;
  } else if (progressNumber > 50 && progressNumber <= 75) {
    return Icon.CircleProgress50;
  } else if (progressNumber > 75 && progressNumber < 100) {
    return Icon.CircleProgress75;
  }
  return Icon.CircleProgress100;
}
