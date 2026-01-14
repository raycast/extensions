import { LocalStorage } from "@raycast/api";
import { TrackingState, DEFAULT_TRACKING_STATE, Worklog } from "./types";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const STATE_DIR = join(homedir(), ".clockwork-tracking");
const STATE_FILE = join(STATE_DIR, "state.json");

function ensureStateDir() {
  try {
    mkdirSync(STATE_DIR, { recursive: true });
  } catch {
    // Ignore
  }
}

const TRACKING_STATE_KEY = "tracking-state";
const RECENT_ISSUES_KEY = "recent-issues";
const WORKLOGS_CACHE_KEY = "worklogs-cache";
const MAX_RECENT_ISSUES = 10;

interface CachedWorklogs {
  entries: Worklog[];
  period: string;
  timestamp: number;
}

export async function getTrackingState(): Promise<TrackingState> {
  const stored = await LocalStorage.getItem<string>(TRACKING_STATE_KEY);
  if (!stored) {
    return DEFAULT_TRACKING_STATE;
  }

  try {
    return JSON.parse(stored) as TrackingState;
  } catch {
    return DEFAULT_TRACKING_STATE;
  }
}

export async function setTrackingState(state: TrackingState): Promise<void> {
  await LocalStorage.setItem(TRACKING_STATE_KEY, JSON.stringify(state));
  // Write to file for script command access
  try {
    ensureStateDir();
    writeFileSync(STATE_FILE, JSON.stringify(state));
  } catch {
    // Ignore file write errors
  }
}

export async function clearTrackingState(): Promise<void> {
  await LocalStorage.setItem(TRACKING_STATE_KEY, JSON.stringify(DEFAULT_TRACKING_STATE));
  // Write to file for script command access
  try {
    ensureStateDir();
    writeFileSync(STATE_FILE, JSON.stringify(DEFAULT_TRACKING_STATE));
  } catch {
    // Ignore file write errors
  }
}

export async function getRecentIssues(): Promise<string[]> {
  const stored = await LocalStorage.getItem<string>(RECENT_ISSUES_KEY);
  if (!stored) {
    return [];
  }

  try {
    return JSON.parse(stored) as string[];
  } catch {
    return [];
  }
}

export async function addRecentIssue(issueKey: string): Promise<void> {
  const recent = await getRecentIssues();
  const filtered = recent.filter((key) => key !== issueKey);
  const updated = [issueKey, ...filtered].slice(0, MAX_RECENT_ISSUES);
  await LocalStorage.setItem(RECENT_ISSUES_KEY, JSON.stringify(updated));
}

export async function getCachedWorklogs(period: string): Promise<Worklog[] | null> {
  const stored = await LocalStorage.getItem<string>(WORKLOGS_CACHE_KEY);
  if (!stored) return null;

  try {
    const cached = JSON.parse(stored) as CachedWorklogs;
    if (cached.period === period) {
      return cached.entries;
    }
    return null;
  } catch {
    return null;
  }
}

export async function setCachedWorklogs(period: string, entries: Worklog[]): Promise<void> {
  const cache: CachedWorklogs = {
    entries,
    period,
    timestamp: Date.now(),
  };
  await LocalStorage.setItem(WORKLOGS_CACHE_KEY, JSON.stringify(cache));
}

export interface RecentIssue {
  issueKey: string;
  issueSummary: string;
  status?: string;
  totalSeconds?: number;
}

export async function getRecentIssuesWithSummary(): Promise<RecentIssue[]> {
  const stored = await LocalStorage.getItem<string>("recent-issues-detailed");
  if (!stored) return [];

  try {
    return JSON.parse(stored) as RecentIssue[];
  } catch {
    return [];
  }
}

export async function addRecentIssueWithSummary(issueKey: string, summary: string, status?: string): Promise<void> {
  const recent = await getRecentIssuesWithSummary();
  const filtered = recent.filter((i) => i.issueKey !== issueKey);
  const updated = [{ issueKey, issueSummary: summary, status }, ...filtered].slice(0, 20);
  await LocalStorage.setItem("recent-issues-detailed", JSON.stringify(updated));
}
