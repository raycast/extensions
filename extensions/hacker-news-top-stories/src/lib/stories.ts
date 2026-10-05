import { Cache } from "@raycast/api";
import { getStories } from "../hackernews";
import { readSyncedStories, removeStaleSyncFiles, writeSyncedStories } from "./icloud-sync";
import { Story } from "../types";

// No namespace, so the menu bar and AI tools share one read list
export const cache = new Cache();
// Stories that the user clicked on
const readKey = "read-stories";
// Stories we've sent a notification about
const notifiedKey = "notified-stories";
// Stories that we've seen over the past week.
// If we've seen something more than 24 hours ago, we remove it
// This allows for stories posted e.g. 3 days ago to hit 500 points today
// [{ story: {}, seen: 1234567890 }]
const seenKey = "seen-stories";
// To cache the points to clear cache when they change
const prefKey = "preferences";

const twentyFourHoursInMs = 24 * 60 * 60 * 1000;
const eightDaysInMs = 8 * twentyFourHoursInMs;

export type SeenStory = { story: Story; seen: number };

export function resetIfPointsChanged(points: string) {
  if (cache.get(prefKey) === points) return;
  cache.clear();
  cache.set(prefKey, points);
}

function getLocalReadStories() {
  return JSON.parse(cache.get(readKey) ?? "[]") as string[];
}

function saveReadStories(urls: string[]) {
  cache.set(readKey, JSON.stringify(urls));
  writeSyncedStories(urls);
}

export function getReadStories() {
  return new Set([...getLocalReadStories(), ...readSyncedStories()]);
}

export function markStoriesRead(urls: string[]) {
  saveReadStories(Array.from(new Set([...getLocalReadStories(), ...urls])));
}

export function getNotifiedStories() {
  return new Set(JSON.parse(cache.get(notifiedKey) ?? "[]") as string[]);
}

export function saveNotifiedStories(notifiedStories: Set<string>) {
  cache.set(notifiedKey, JSON.stringify(Array.from(notifiedStories)));
}

export function getSeenStories() {
  return JSON.parse(cache.get(seenKey) ?? "[]") as SeenStory[];
}

export function getRecentStories(seenStories = getSeenStories()) {
  const now = Date.now();
  return seenStories.filter(({ seen }) => now - seen < twentyFourHoursInMs).map(({ story }) => story);
}

export async function refreshStories(points: string) {
  const seenStories = getSeenStories();
  const stories = await getStories(points || "500", { cache });
  const now = Date.now();
  const seenUrls = new Set(seenStories.map(({ story }) => story.external_url));

  const unseenStories = stories
    .filter((story) => !seenUrls.has(story.external_url))
    .map((story) => ({ story, seen: now }));

  const allStoriesSeen = [...seenStories, ...unseenStories]
    // A day past the feed's 7-day window, so a dropped story can't return as new
    .filter(({ seen }) => now - seen < eightDaysInMs)
    .sort((a, b) => b.seen - a.seen);
  cache.set(seenKey, JSON.stringify(allStoriesSeen));

  const keptUrls = new Set(allStoriesSeen.map(({ story }) => story.external_url));
  saveReadStories(getLocalReadStories().filter((url) => keptUrls.has(url)));
  removeStaleSyncFiles();

  return {
    recent: getRecentStories(allStoriesSeen),
    unseen: unseenStories.map(({ story }) => story),
    isFirstLoad: seenStories.length === 0,
  };
}

export function storyId(story: Story) {
  return new URL(story.external_url).searchParams.get("id") ?? story.external_url;
}

export function getPointsFromContent(content: string) {
  const match = content.match(/Points: (\d+)/);
  return match ? match[1] : null;
}

export function getCommentsFromContent(content: string) {
  const match = content.match(/# Comments: (\d+)/);
  return match ? match[1] : null;
}
