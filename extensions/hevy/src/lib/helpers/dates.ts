import { format } from "date-fns";

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return format(date, "MMM dd, yyyy");
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return format(date, "MMM dd, yyyy 'at' HH:mm");
}

export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return format(date, "HH:mm");
}
