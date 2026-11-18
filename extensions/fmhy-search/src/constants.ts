export interface CategoryPage {
  name: string;
  path: string;
  category: string;
}

export const CATEGORY_PAGES: CategoryPage[] = [
  { name: "Beginners Guide", path: "beginners-guide.md", category: "guide" },
  { name: "Adblocking & Privacy", path: "privacy.md", category: "privacy" },
  { name: "Artificial Intelligence", path: "ai.md", category: "ai" },
  { name: "Movies / TV / Anime", path: "video.md", category: "video" },
  { name: "Music / Podcasts / Radio", path: "audio.md", category: "audio" },
  { name: "Gaming / Emulation", path: "gaming.md", category: "gaming" },
  { name: "Books / Comics / Manga", path: "reading.md", category: "reading" },
  { name: "Downloading", path: "downloading.md", category: "downloading" },
  { name: "Torrenting", path: "torrenting.md", category: "torrenting" },
  { name: "Educational", path: "educational.md", category: "educational" },
  { name: "Android / iOS", path: "mobile.md", category: "mobile" },
  { name: "Linux / macOS", path: "linux-macos.md", category: "linux-macos" },
  { name: "Non-English", path: "non-english.md", category: "non-english" },
  { name: "Miscellaneous", path: "misc.md", category: "misc" },
  { name: "System Tools", path: "system-tools.md", category: "system-tools" },
  { name: "File Tools", path: "file-tools.md", category: "file-tools" },
  {
    name: "Internet Tools",
    path: "internet-tools.md",
    category: "internet-tools",
  },
  {
    name: "Social Media Tools",
    path: "social-media-tools.md",
    category: "social-media-tools",
  },
  { name: "Text Tools", path: "text-tools.md", category: "text-tools" },
  { name: "Gaming Tools", path: "gaming-tools.md", category: "gaming-tools" },
  { name: "Image Tools", path: "image-tools.md", category: "image-tools" },
  { name: "Video Tools", path: "video-tools.md", category: "video-tools" },
  {
    name: "Developer Tools",
    path: "developer-tools.md",
    category: "developer-tools",
  },
  { name: "Unsafe Sites", path: "unsafe.md", category: "unsafe" },
  {
    name: "Recently Removed",
    path: "recently-removed.md",
    category: "recently-removed",
  },
  { name: "Storage", path: "storage.md", category: "storage" },
];
