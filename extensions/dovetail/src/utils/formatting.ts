import { format, differenceInDays } from "date-fns";

export function formatRelativeDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const days = differenceInDays(now, date);
  if (days <= 0) return "Today";
  if (days < 7) return `${days}d`;
  return format(date, "MMM d");
}

export function formatFullDate(dateString: string) {
  const date = new Date(dateString);
  return `Created: ${format(date, "EEEE d MMMM yyyy 'at' HH:mm")}`;
}

export function truncate(text: string | null | undefined, maxLength = 80): string | undefined {
  if (!text) return undefined;
  const trimmed = text.trim().replace(/\s+/g, " ");
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1)}…` : trimmed;
}

export function cleanMarkdown(md: string): string {
  return md
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s+|\s+$/g, "")
    .replace(/\n\s+\n/g, "\n\n");
}
