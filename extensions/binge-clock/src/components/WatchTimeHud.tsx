import { showToast, Toast } from "@raycast/api";
import { ShowWatchTime } from "../interface/show-watch-time";

function getTimePart(value: number | null, unit: string): string | null {
  if (value === null) {
    return null;
  }

  return `${value} ${unit}`;
}

export function watchTimeHUD(props: { watchTime: ShowWatchTime; title: string }) {
  const { watchTime, title } = props;
  const timeParts = [
    getTimePart(watchTime.days, "days"),
    getTimePart(watchTime.hours, "hours"),
    getTimePart(watchTime.minutes, "minutes"),
  ].filter((part): part is string => part !== null);

  if (timeParts.length === 0) {
    showToast({ style: Toast.Style.Failure, title, message: "No watch time found" });
    return;
  }

  showToast({ style: Toast.Style.Success, title, message: timeParts.join(" ") });
}
