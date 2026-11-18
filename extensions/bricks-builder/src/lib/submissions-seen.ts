import { LocalStorage } from "@raycast/api";

/** The newest submission id seen per site, so the menu bar and list can tell what's new. */
const key = (siteId: string) => `forms:seen:${siteId}`;

export async function getSeen(siteId: string): Promise<number | undefined> {
  const value = await LocalStorage.getItem<number>(key(siteId));
  return typeof value === "number" ? value : undefined;
}

export async function setSeen(siteId: string, maxId: number) {
  const current = (await getSeen(siteId)) ?? 0;
  if (maxId > current) await LocalStorage.setItem(key(siteId), maxId);
}
