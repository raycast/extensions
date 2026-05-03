import { LocalStorage } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { AuditEntry, ThreatFeed } from "./types";

const AUDIT_KEY = "secure-redact.audit.v1";
const FEEDS_KEY = "secure-redact.feeds.v1";
const MAX_AUDIT_ENTRIES = 500;

export async function getAuditEntries(): Promise<AuditEntry[]> {
  const stored = await LocalStorage.getItem<string>(AUDIT_KEY);
  if (!stored) return [];

  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export async function addAuditEntry(
  entry: Omit<AuditEntry, "id">
): Promise<void> {
  const entries = await getAuditEntries();
  const newEntry: AuditEntry = {
    ...entry,
    id: randomUUID(),
  };

  entries.unshift(newEntry);

  if (entries.length > MAX_AUDIT_ENTRIES) {
    entries.splice(MAX_AUDIT_ENTRIES);
  }

  await LocalStorage.setItem(AUDIT_KEY, JSON.stringify(entries));
}

export async function clearAudit(): Promise<void> {
  await LocalStorage.removeItem(AUDIT_KEY);
}

export async function getThreatFeeds(): Promise<ThreatFeed[]> {
  const stored = await LocalStorage.getItem<string>(FEEDS_KEY);
  if (!stored) return [];

  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export async function setThreatFeeds(feeds: ThreatFeed[]): Promise<void> {
  await LocalStorage.setItem(FEEDS_KEY, JSON.stringify(feeds));
}

export async function addThreatFeed(
  feed: Omit<ThreatFeed, "id" | "created" | "modified">
): Promise<void> {
  const feeds = await getThreatFeeds();
  const newFeed: ThreatFeed = {
    ...feed,
    id: randomUUID(),
    created: Date.now(),
    modified: Date.now(),
  };

  feeds.push(newFeed);
  await setThreatFeeds(feeds);
}

export async function updateThreatFeed(
  id: string,
  updates: Partial<Omit<ThreatFeed, "id" | "created">>
): Promise<void> {
  const feeds = await getThreatFeeds();
  const index = feeds.findIndex((f) => f.id === id);

  if (index !== -1) {
    feeds[index] = {
      ...feeds[index],
      ...updates,
      modified: Date.now(),
    };
    await setThreatFeeds(feeds);
  }
}

export async function deleteThreatFeed(id: string): Promise<void> {
  const feeds = await getThreatFeeds();
  const filtered = feeds.filter((f) => f.id !== id);
  await setThreatFeeds(filtered);
}
