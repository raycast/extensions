import { Color } from "@raycast/api";

export const BASE_API_URL: string = "https://reactnative.directory/api/libraries";

export const SCORING_URL: string = "https://reactnative.directory/scoring";

export const CHROME_APPLICATION: string = "com.google.Chrome";

export const sortDropdownItems = [
  {
    title: "Sort By",
    items: [
      { value: "relevance", title: "Relevance" },
      { value: "updated", title: "Last Updated" },
      { value: "added", title: "Recently Added" },
      { value: "recommended", title: "Recommended" },
      { value: "quality", title: "Quality" },
      { value: "popularity", title: "Popularity Gain" },
      { value: "issues", title: "Issues" },
      { value: "downloads", title: "Downloads" },
      { value: "stars", title: "Stars" },
    ],
  },
  {
    title: "Platform",
    items: [
      { value: "android", title: "Android" },
      { value: "expo", title: "Expo Go" },
      { value: "ios", title: "iOS" },
      { value: "macos", title: "macOS" },
      { value: "tvos", title: "tvOS" },
      { value: "visionos", title: "visionOS" },
      { value: "web", title: "Web" },
      { value: "windows", title: "Windows" },
    ],
  },
  {
    title: "Status",
    items: [
      { value: "hasExample", title: "Has example" },
      { value: "hasImage", title: "Has image preview" },
      { value: "hasTypes", title: "Has TypeScript types" },
      { value: "newArchitecture", title: "Supports New Architecture" },
      { value: "isMaintained", title: "Maintained" },
      { value: "isPopular", title: "Popular" },
      { value: "wasRecentlyUpdated", title: "Recently updated" },
      { value: "isRecommended", title: "Recommended" },
    ],
  },
  {
    title: "Type",
    items: [
      { value: "skipLibs", title: "Hide libraries" },
      { value: "skipTools", title: "Hide development tools" },
      { value: "skipTemplates", title: "Hide templates" },
    ],
  },
];

export const compatibilityColors: { [key: string]: Color } = {
  "Development Tool": Color.Blue,
  Template: Color.Purple,
  "New Architecture": Color.Green,
  "Expo Go": Color.Orange,
};

export const platformColors: { [key: string]: Color } = {
  Android: Color.Green,
  iOS: Color.Blue,
  Web: Color.Orange,
  Windows: Color.Purple,
  macOS: Color.Red,
  tvOS: Color.Yellow,
  visionOS: Color.Magenta,
};
