import { showToast, Toast } from "@raycast/api";

export function formatArgumentDate(date: string): Date {
  if (!date || date === "") {
    return new Date();
  }
  if (date.toLowerCase() === "today" || date.toLowerCase() === "t") {
    return new Date();
  }
  if (date.toLowerCase() === "yesterday" || date.toLowerCase() === "y") {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  }
  if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return new Date(date);
  }
  showToast(Toast.Style.Failure, "Invalid date", "Please use the format YYYY-MM-DD");
  return new Date();
}
