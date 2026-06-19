import { authedFetch } from "@/lib/auth";

export type Announcement = { id: string; title: string; creator: string; created_at: string; hit: string };

export async function getAnnouncements() {
  const response = await authedFetch("announcements", { method: "GET" });
  const data = (await response.json()) as Announcement[];

  if (!(data instanceof Array)) return null;

  return data;
}

export type AnnouncementContent = { content: string };

export async function getAnnouncementContent(id: string) {
  const response = await authedFetch(`announcements/${id}`, { method: "GET" });

  const data = (await response.json()) as AnnouncementContent;

  if (!data) return null;

  return data;
}
