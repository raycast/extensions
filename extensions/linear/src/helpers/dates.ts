import { Icon, Image, Color } from "@raycast/api";
import { differenceInDays, startOfToday } from "date-fns";

export function getDateIcon(dueDate: Date): Image.ImageLike {
  const daysBetweenDueDateAndToday = differenceInDays(dueDate, startOfToday());

  let color = Color.PrimaryText;

  if (daysBetweenDueDateAndToday <= 7) {
    color = Color.Orange;
  }

  if (daysBetweenDueDateAndToday <= 0) {
    color = Color.Red;
  }

  return { source: Icon.Calendar, tintColor: color };
}
