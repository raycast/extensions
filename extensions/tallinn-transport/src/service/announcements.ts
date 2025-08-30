import { fetchAnnouncements, type AnnouncementRaw } from "@/api";
import { CacheManager } from "@/utils/cache";

const cache = new CacheManager<AnnouncementRaw[]>({ key: "announcements" });

export const getAnnouncements = async () => {
  const cachedData = cache.get();

  if (cachedData) {
    return cachedData;
  }

  const announcements = await fetchAnnouncements();

  cache.set(announcements);

  return announcements;
};
