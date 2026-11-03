import { Icon } from "@raycast/api";

// Category IDs are the public Glaze Store API's values.
export const STORE_CATEGORIES = [
  { value: "", title: "All Categories", icon: Icon.AppWindowGrid3x3 },
  { value: "developer-tools", title: "Developer Tools", icon: Icon.Hammer },
  { value: "productivity", title: "Productivity", icon: Icon.CheckCircle },
  { value: "utilities", title: "Utilities", icon: Icon.WrenchScrewdriver },
  { value: "media", title: "Media", icon: Icon.Headphones },
  { value: "design", title: "Design", icon: Icon.Brush },
  { value: "lifestyle", title: "Lifestyle", icon: Icon.Heart },
  { value: "games-and-fun", title: "Games & Fun", icon: Icon.GameController },
];

export const STORE_SORTS = [
  { value: "popular", title: "Popular" },
  { value: "newest", title: "Newest" },
  { value: "recently_updated", title: "Recently Updated" },
] as const;
export type StoreSort = (typeof STORE_SORTS)[number]["value"];
