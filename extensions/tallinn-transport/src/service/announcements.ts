import { fetchAnnouncements, type AnnouncementRaw } from "@/api";

export const getAnnouncements = () => {
  return fetchAnnouncements() as Promise<AnnouncementRaw[]>;
};
