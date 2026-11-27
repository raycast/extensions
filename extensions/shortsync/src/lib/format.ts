import type { Post } from "./types";

/** "Today 14:30", "Tomorrow 09:00", "Fri 28 Nov, 14:30" in the user's locale. */
export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "No time set";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const time = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(date) - startOfDay(new Date())) / 86_400_000);

  if (dayDiff === 0) return `Today ${time}`;
  if (dayDiff === 1) return `Tomorrow ${time}`;
  if (dayDiff === -1) return `Yesterday ${time}`;
  const sameYear = date.getFullYear() === new Date().getFullYear();
  const day = date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  return `${day}, ${time}`;
}

/** Compact time for the menu bar: "14:30" today, "Fri 14:30" this week, "28 Nov" later. */
export function formatMenuBarTime(iso: string): string {
  const date = new Date(iso);
  const diffDays = (date.getTime() - Date.now()) / 86_400_000;
  const time = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  if (date.toDateString() === new Date().toDateString()) return time;
  if (diffDays < 6) return `${date.toLocaleDateString(undefined, { weekday: "short" })} ${time}`;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** The text a post shows: caption, or title/description on platforms without captions. */
export function postText(post: Pick<Post, "caption" | "title" | "description">): string {
  return (post.caption || post.title || post.description || "").trim();
}

export function truncate(text: string, max: number): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > max ? `${oneLine.slice(0, max - 1).trimEnd()}…` : oneLine;
}

export function firstLine(text: string): string {
  return (
    text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find(Boolean) ?? ""
  );
}
