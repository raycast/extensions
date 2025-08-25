import { LocalStorage } from "@raycast/api";

const PINNED_LINKS_KEY = "pinned-links";

export async function getPinnedSlugs(): Promise<string[]> {
  const stored = await LocalStorage.getItem<string>(PINNED_LINKS_KEY);
  if (!stored) return [];

  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export async function setPinnedSlugs(slugs: string[]): Promise<void> {
  await LocalStorage.setItem(PINNED_LINKS_KEY, JSON.stringify(slugs));
}

export async function pinLink(slug: string): Promise<void> {
  const pinned = await getPinnedSlugs();
  if (!pinned.includes(slug)) {
    await setPinnedSlugs([...pinned, slug]);
  }
}

export async function unpinLink(slug: string): Promise<void> {
  const pinned = await getPinnedSlugs();
  await setPinnedSlugs(pinned.filter((s) => s !== slug));
}

export async function movePinnedLink(slug: string, direction: "up" | "down"): Promise<boolean> {
  const pinned = await getPinnedSlugs();
  const index = pinned.indexOf(slug);

  if (index === -1) return false;

  const newIndex = direction === "up" ? index - 1 : index + 1;

  // Check boundaries
  if (newIndex < 0 || newIndex >= pinned.length) {
    return false;
  }

  // Swap elements
  const newPinned = [...pinned];
  [newPinned[index], newPinned[newIndex]] = [newPinned[newIndex], newPinned[index]];

  await setPinnedSlugs(newPinned);
  return true;
}

export async function cleanupPinnedSlugs(existingSlugs: string[]): Promise<string[]> {
  const pinned = await getPinnedSlugs();
  const validPinned = pinned.filter((slug) => existingSlugs.includes(slug));

  // Update storage if there were invalid slugs
  if (validPinned.length !== pinned.length) {
    await setPinnedSlugs(validPinned);
  }

  return validPinned;
}
