import { Icon } from "@raycast/api";

export const categories: Category[] = [
  { title: "Top 100", value: "top-100", icon: Icon.ChevronUp },
  { title: "Movies", value: "top-100-movies", icon: Icon.Video },
  { title: "TV Shows", value: "top-100-television", icon: Icon.Desktop },
  { title: "Apps", value: "top-100-applications", icon: Icon.Window },
  { title: "Music", value: "top-100-music", icon: Icon.SpeakerArrowUp },
  { title: "Documentary", value: "top-100-documentaries", icon: Icon.Video },
  { title: "Anime", value: "top-100-anime", icon: Icon.Video },
  { title: "Other", value: "top-100-other", icon: Icon.Document },
  { title: "Trending", value: "trending", icon: Icon.TwoArrowsClockwise },
  { title: "XXX", value: "top-100-xxx", icon: Icon.EyeSlash },
];

export interface Category {
  title: string;
  value: string;
  icon: Icon;
}
