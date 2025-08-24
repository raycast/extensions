import { Language, FeedConfig } from "../types";

export const FEEDS: Record<Language, FeedConfig> = {
  ru: {
    url: "https://meduza.io/rss/all",
  },
  en: {
    url: "https://meduza.io/rss/en/all",
  },
} as const;
