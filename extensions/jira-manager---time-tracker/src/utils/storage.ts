import { LocalStorage } from "@raycast/api";

const KEY_ACTIVE_ISSUE = "active-issue";
const KEY_LAST_ISSUE = "last-issue";

export interface ActiveIssue {
  issueKey: string;
  startTime: number; // Timestamp
  elapsedSeconds: number; // Previously elapsed time if paused
  isRunning: boolean;
  summary?: string; // Cache summary for display
}

export interface LastIssue {
  issueKey: string;
  summary?: string;
}

export async function getActiveIssue(): Promise<ActiveIssue | null> {
  const data = await LocalStorage.getItem<string>(KEY_ACTIVE_ISSUE);
  if (!data) return null;
  return JSON.parse(data);
}

export async function getLastIssue(): Promise<LastIssue | null> {
  const data = await LocalStorage.getItem<string>(KEY_LAST_ISSUE);
  if (!data) return null;
  return JSON.parse(data);
}

async function saveLastIssue(issueKey: string, summary?: string) {
  await LocalStorage.setItem(KEY_LAST_ISSUE, JSON.stringify({ issueKey, summary }));
}

export async function startIssue(issueKey: string, summary?: string) {
  const active = await getActiveIssue();

  // If we are logging per segment, we don't need to accumulate elapsedSeconds.
  // Every Start is a new segment.
  const newActive: ActiveIssue = {
    issueKey,
    startTime: Date.now(),
    elapsedSeconds: 0,
    isRunning: true,
    summary: summary || active?.summary,
  };
  await LocalStorage.setItem(KEY_ACTIVE_ISSUE, JSON.stringify(newActive));
  // Save as last issue
  await saveLastIssue(issueKey, summary || active?.summary);
}

export async function pauseIssue(): Promise<{ issueKey: string; timeSpentSeconds: number; started: Date } | null> {
  const active = await getActiveIssue();
  if (!active || !active.isRunning) return null;

  const now = Date.now();
  const elapsed = Math.floor((now - active.startTime) / 1000); // Only current segment

  // Save as last issue before removing
  await saveLastIssue(active.issueKey, active.summary);

  // We remove it from storage because we are logging this segment.
  // "Pause" in this context (auto-log) implies finishing a session.
  // If user wants to "Resume", they just Start again, creating a new Worklog.
  await LocalStorage.removeItem(KEY_ACTIVE_ISSUE);

  return {
    issueKey: active.issueKey,
    timeSpentSeconds: elapsed,
    started: new Date(active.startTime),
  };
}

export async function stopIssue(): Promise<{ issueKey: string; timeSpentSeconds: number; started: Date } | null> {
  // Stop and Pause are identical in "Log per segment" model: both calculate time since start, return it, and clear storage.
  return pauseIssue();
}
