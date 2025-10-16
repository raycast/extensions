export function formatDateToReadable(date: Date): string {
  if (date.getDate() === new Date().getDate()) {
    return "Today";
  }
  if (date.getDate() === new Date().getDate() - 1) {
    return "Yesterday";
  }
  return date.toLocaleDateString();
}
