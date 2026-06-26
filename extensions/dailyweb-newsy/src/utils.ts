import type { Post } from "./types";

export async function parsePostsResponse(response: Response): Promise<Post[]> {
  if (!response.ok) {
    throw new Error(response.statusText);
  }

  const data: unknown = await response.json();
  if (Array.isArray(data)) {
    return data;
  }

  if (data && typeof data === "object" && "message" in data) {
    const message = (data as { message: unknown }).message;
    if (typeof message === "string") {
      throw new Error(message);
    }
  }

  throw new Error("Unexpected response from Dailyweb API");
}

export function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "").trim();
}

export function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-zA-Z]+;/g, "");
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (sameDay(date, now)) {
    if (diffMins < 1) return "just now";
    if (diffMins === 1) return "1 minute ago";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours === 1) return "1 hour ago";
    return `${diffHours} hours ago`;
  }

  if (sameDay(date, yesterday)) return "yesterday";

  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
