import type { SitemapEntry } from "./sitemap";

export function getSitemapEntryTitle(url: string): string {
  const pathname = new URL(url).pathname;
  const segment = pathname.replace(/\/$/, "").split("/").at(-1);
  return segment || url;
}

export function getSitemapEntryAccessories(entry: SitemapEntry): { text: string }[] {
  const accessories: { text: string }[] = [];
  if (entry.lastModified) {
    accessories.push({ text: entry.lastModified.slice(0, 10) });
  }
  if (entry.changeFrequency) {
    accessories.push({ text: entry.changeFrequency });
  }
  if (entry.priority) {
    accessories.push({ text: entry.priority });
  }
  return accessories;
}
