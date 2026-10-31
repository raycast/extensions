// Source IDs match Pond v1.0.1. Keep IDs stable when changing labels.
export const SOURCES = [
  { id: "twitter", title: "X / Twitter" },
  { id: "instagram", title: "Instagram" },
  { id: "pinterest", title: "Pinterest" },
  { id: "arena", title: "Are.na" },
  { id: "cosmos", title: "Cosmos" },
  { id: "tiktok", title: "TikTok" },
  { id: "youtube", title: "YouTube" },
  { id: "reddit", title: "Reddit" },
  { id: "threads", title: "Threads" },
  { id: "web", title: "Web" },
  { id: "local", title: "Local" },
];

export function sourceLabel(source: string): string {
  return SOURCES.find((item) => item.id === source)?.title ?? source;
}
