import { LocalStorage } from "@raycast/api";
import { Website, TimeRange } from "./types";

const WEBSITES_KEY = "websites";
const ACTIVE_WEBSITE_KEY = "activeWebsiteId";
const TIME_RANGE_KEY = "timeRange";

export async function getWebsites(): Promise<Website[]> {
  const data = await LocalStorage.getItem<string>(WEBSITES_KEY);
  if (!data) {
    return [];
  }
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function saveWebsites(websites: Website[]): Promise<void> {
  await LocalStorage.setItem(WEBSITES_KEY, JSON.stringify(websites));
}

export async function addWebsite(website: Omit<Website, "id">): Promise<Website> {
  const websites = await getWebsites();
  const newWebsite: Website = {
    ...website,
    id: generateId(),
  };
  websites.push(newWebsite);
  await saveWebsites(websites);

  if (websites.length === 1) {
    await setActiveWebsiteId(newWebsite.id);
  }

  return newWebsite;
}

export async function updateWebsite(id: string, updates: Partial<Omit<Website, "id">>): Promise<Website | null> {
  const websites = await getWebsites();
  const index = websites.findIndex((w) => w.id === id);
  if (index === -1) {
    return null;
  }
  websites[index] = { ...websites[index], ...updates };
  await saveWebsites(websites);
  return websites[index];
}

export async function removeWebsite(id: string): Promise<void> {
  const websites = await getWebsites();
  const filtered = websites.filter((w) => w.id !== id);
  await saveWebsites(filtered);

  const activeId = await getActiveWebsiteId();
  if (activeId === id && filtered.length > 0) {
    await setActiveWebsiteId(filtered[0].id);
  } else if (filtered.length === 0) {
    await LocalStorage.removeItem(ACTIVE_WEBSITE_KEY);
  }
}

export async function getActiveWebsiteId(): Promise<string | null> {
  const id = await LocalStorage.getItem<string>(ACTIVE_WEBSITE_KEY);
  return id || null;
}

export async function setActiveWebsiteId(id: string): Promise<void> {
  await LocalStorage.setItem(ACTIVE_WEBSITE_KEY, id);
}

export async function getActiveWebsite(): Promise<Website | null> {
  const id = await getActiveWebsiteId();
  if (!id) {
    const websites = await getWebsites();
    return websites.length > 0 ? websites[0] : null;
  }
  const websites = await getWebsites();
  return websites.find((w) => w.id === id) || (websites.length > 0 ? websites[0] : null);
}

export async function cycleToNextWebsite(): Promise<Website | null> {
  const websites = await getWebsites();
  if (websites.length <= 1) {
    return websites[0] || null;
  }

  const currentId = await getActiveWebsiteId();
  const currentIndex = websites.findIndex((w) => w.id === currentId);
  const nextIndex = (currentIndex + 1) % websites.length;
  const nextWebsite = websites[nextIndex];

  await setActiveWebsiteId(nextWebsite.id);
  return nextWebsite;
}

export async function getTimeRange(): Promise<TimeRange> {
  const range = await LocalStorage.getItem<string>(TIME_RANGE_KEY);
  if (range === "today" || range === "7d" || range === "30d") {
    return range;
  }
  return "today";
}

export async function setTimeRange(range: TimeRange): Promise<void> {
  await LocalStorage.setItem(TIME_RANGE_KEY, range);
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
