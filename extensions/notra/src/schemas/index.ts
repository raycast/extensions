import { Icon } from "@raycast/api";
import type { ContentTypeFilter } from "../types";

interface ContentTypeOption {
  icon: Icon;
  title: string;
  value: ContentTypeFilter;
}

export const CONTENT_TYPE_OPTIONS: ContentTypeOption[] = [
  { title: "All Types", value: "all", icon: Icon.BulletPoints },
  { title: "Blog Post", value: "blog_post", icon: Icon.Document },
  { title: "Changelog", value: "changelog", icon: Icon.Megaphone },
  { title: "Tweet", value: "twitter_post", icon: Icon.Bird },
  { title: "LinkedIn Post", value: "linkedin_post", icon: Icon.PersonLines },
];

export const CONTENT_TYPE_LABELS: Record<string, string> = {
  blog_post: "Blog Post",
  changelog: "Changelog",
  twitter_post: "Tweet",
  linkedin_post: "LinkedIn",
};

export const CONTENT_TYPE_ICONS: Record<string, Icon> = {
  blog_post: Icon.Document,
  changelog: Icon.Megaphone,
  twitter_post: Icon.Bird,
  linkedin_post: Icon.PersonLines,
};

export const LOOKBACK_WINDOW_OPTIONS = [
  { title: "Today", value: "current_day" },
  { title: "Yesterday", value: "yesterday" },
  { title: "Last 7 Days", value: "last_7_days" },
  { title: "Last 14 Days", value: "last_14_days" },
  { title: "Last 30 Days", value: "last_30_days" },
];

export const TONE_PROFILE_OPTIONS = [
  { title: "Conversational", value: "Conversational" },
  { title: "Professional", value: "Professional" },
  { title: "Casual", value: "Casual" },
  { title: "Formal", value: "Formal" },
];
