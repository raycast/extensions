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
      { value: "newArchitecture", title: "Supports New Architecture" },
      { value: "hasNativeCode", title: "Uses native code" },
      { value: "hasExample", title: "Has example" },
      { value: "hasImage", title: "Has image preview" },
      { value: "hasTypes", title: "Has TypeScript types" },
      { value: "wasRecentlyUpdated", title: "Recently updated" },
      { value: "isMaintained", title: "Maintained" },
      { value: "isPopular", title: "Popular" },
    ],
  },
  {
    title: "Compatibility",
    items: [
      { value: "expoGo", title: "Works with Expo Go" },
      { value: "fireos", title: "Works with Fire OS" },
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
  "Development Tool": Color.Purple,
  Template: Color.Magenta,
  "New Architecture": Color.Blue,
  "Old Architecture": Color.Yellow,
  "Expo Go": Color.PrimaryText,
};

export const platformColors: { [key: string]: Color } = {
  Android: Color.Green,
  iOS: Color.PrimaryText,
  Web: Color.Magenta,
  Windows: Color.Blue,
  macOS: Color.PrimaryText,
  tvOS: Color.PrimaryText,
  visionOS: Color.PrimaryText,
};

export const MUL = 1000;
export const SUFFIXES = ["B", "kB", "MB"];
