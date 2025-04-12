import { LocalStorage } from "@raycast/api";

export interface Site {
  name: string;
  value: string;
  urlTemplate: string;
}

export const defaultSites: Site[] = [
  {
    name: "Raycast",
    value: "raycast",
    urlTemplate: "https://www.raycast.com/{profile}",
  },
  {
    name: "Threads",
    value: "threads",
    urlTemplate: "https://www.threads.net/@{profile}",
  },
  { 
    name: "X", 
    value: "x", 
    urlTemplate: "https://x.com/{profile}"
  },
  {
    name: "GitHub",
    value: "github",
    urlTemplate: "https://github.com/{profile}",
  },
  {
    name: "Facebook",
    value: "facebook",
    urlTemplate: "https://www.facebook.com/{profile}",
  },
  {
    name: "Reddit",
    value: "reddit",
    urlTemplate: "https://www.reddit.com/user/{profile}",
  },
  {
    name: "YouTube",
    value: "youtube",
    urlTemplate: "https://www.youtube.com/user/{profile}",
  },
  {
    name: "Instagram",
    value: "instagram",
    urlTemplate: "https://www.instagram.com/{profile}",
  },
  {
    name: "LinkedIn",
    value: "linkedin",
    urlTemplate: "https://www.linkedin.com/in/{profile}",
  },
  {
    name: "TikTok",
    value: "tiktok",
    urlTemplate: "https://www.tiktok.com/@{profile}",
  },
];

export async function getAllSites(): Promise<Site[]> {
  const customSitesJson = await LocalStorage.getItem<string>("customSites");
  const customSites: Site[] = customSitesJson ? JSON.parse(customSitesJson) : [];
  return [...defaultSites, ...customSites];
}
