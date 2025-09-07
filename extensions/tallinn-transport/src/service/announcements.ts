import { fetchAnnouncements } from "@/api";
import { withCache } from "@raycast/utils";

export const getCachedAnnouncements = withCache(fetchAnnouncements, {
  maxAge: 1000 * 60 * 15, // 15 minutes
});
