import { format, differenceInDays } from "date-fns";

export function formatRelativeDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const days = differenceInDays(now, date);
  if (days < 1) return "1d";
  if (days < 7) return `${days + 1}d`;
  return format(date, "MMM d");
}

export function formatFullDate(dateString: string) {
  const date = new Date(dateString);
  return `Created: ${format(date, "EEEE d MMMM yyyy 'at' HH:mm")}`;
}

export function cleanMarkdown(md: string): string {
  return md
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s+|\s+$/g, "")
    .replace(/\n\s+\n/g, "\n\n");
}
