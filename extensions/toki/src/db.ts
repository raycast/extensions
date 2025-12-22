import { getPreferenceValues } from "@raycast/api";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as fsPromises from "fs/promises";
import * as path from "path";

// Types
export type ItemStatus = "active" | "archived";

export interface Group {
  uuid: string;
  title: string;
  color: string;
  activityCount: number;
  status: ItemStatus;
  trackedDuration: number;
  lastActivity: number;
  tracking: { activityUuid: string; startTime: number } | null;
}

export interface Activity {
  uuid: string;
  title: string;
  status: ItemStatus;
  trackedDuration: number;
  lastEntryDate: string | null;
  lastActivity: number;
  tracking: { startTime: number } | null;
}

export interface TrackingSession {
  groupUuid: string;
  groupTitle: string;
  groupColor: string;
  activityUuid: string;
  activityTitle: string;
  startTime: number;
  trackedDuration: number;
}

export interface DayActivity {
  activityTitle: string;
  groupTitle: string;
  groupUuid: string;
  activityUuid: string;
  duration: number;
}

export interface DayStats {
  date: string;
  label: string;
  duration: number;
  activities: DayActivity[];
}

export interface DaysStats {
  totalDuration: number;
  days: DayStats[];
}

export interface RecentActivity {
  groupUuid: string;
  groupTitle: string;
  activityUuid: string;
  activityTitle: string;
}

// Internal storage types
interface StoredGroup {
  id: string;
  title: string;
  color: string;
  status: ItemStatus;
  updatedAt: number;
}

interface StoredActivity {
  id: string;
  groupId: string;
  title: string;
  status: ItemStatus;
  updatedAt: number;
}

interface StoredEntry {
  id: string;
  activityId: string;
  date: string;
  duration: number;
  status: ItemStatus;
  createdAt: number;
}

interface StoredTracking {
  groupId: string;
  activityId: string;
  startTime: number;
}

interface Database {
  groups: StoredGroup[];
  activities: StoredActivity[];
  entries: StoredEntry[];
  tracking: StoredTracking | null;
}

// File path from preferences
function getDbPath(): string {
  const { dataPath } = getPreferenceValues();
  return dataPath.replace(/^~/, process.env.HOME || "");
}

// Indexed database for O(1) lookups
interface IndexedDatabase extends Database {
  activitiesByGroup: Map<string, StoredActivity[]>;
  entriesByActivity: Map<string, StoredEntry[]>;
  activityById: Map<string, StoredActivity>;
  groupById: Map<string, StoredGroup>;
}

function indexDb(db: Database): IndexedDatabase {
  const activitiesByGroup = new Map<string, StoredActivity[]>();
  const entriesByActivity = new Map<string, StoredEntry[]>();
  const activityById = new Map<string, StoredActivity>();
  const groupById = new Map<string, StoredGroup>();

  for (const g of db.groups) {
    groupById.set(g.id, g);
  }

  for (const a of db.activities) {
    activityById.set(a.id, a);
    const list = activitiesByGroup.get(a.groupId) || [];
    list.push(a);
    activitiesByGroup.set(a.groupId, list);
  }

  for (const e of db.entries) {
    const list = entriesByActivity.get(e.activityId) || [];
    list.push(e);
    entriesByActivity.set(e.activityId, list);
  }

  return { ...db, activitiesByGroup, entriesByActivity, activityById, groupById };
}

function loadDb(): IndexedDatabase {
  try {
    const dbPath = getDbPath();
    if (fs.existsSync(dbPath)) {
      return indexDb(JSON.parse(fs.readFileSync(dbPath, "utf-8")));
    }
  } catch {
    // Ignore errors, return empty db
  }
  return indexDb({ groups: [], activities: [], entries: [], tracking: null });
}

async function loadDbAsync(): Promise<IndexedDatabase> {
  try {
    const dbPath = getDbPath();
    const content = await fsPromises.readFile(dbPath, "utf-8");
    return indexDb(JSON.parse(content));
  } catch {
    // Ignore errors, return empty db
  }
  return indexDb({ groups: [], activities: [], entries: [], tracking: null });
}

function saveDb(db: Database): void {
  const dbPath = getDbPath();
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

// Groups
export async function getGroups(): Promise<Group[]> {
  const db = await loadDbAsync();
  const tracking = db.tracking;
  return db.groups
    .map((g) => {
      const activities = db.activitiesByGroup.get(g.id) || [];
      const activeActivities = activities.filter((a) => a.status === "active");
      let trackedDuration = 0;
      for (const a of activities) {
        const entries = db.entriesByActivity.get(a.id) || [];
        for (const e of entries) {
          if (e.status === "active") trackedDuration += e.duration;
        }
      }
      const isTracking = tracking?.groupId === g.id;
      return {
        uuid: g.id,
        title: g.title,
        color: g.color,
        activityCount: activeActivities.length,
        status: g.status,
        trackedDuration,
        lastActivity: g.updatedAt,
        tracking: isTracking ? { activityUuid: tracking.activityId, startTime: tracking.startTime } : null,
      };
    })
    .sort((a, b) => b.lastActivity - a.lastActivity);
}

export async function createGroup(title: string, color?: string): Promise<Group> {
  const db = loadDb();
  const now = Math.floor(Date.now() / 1000);
  const group: StoredGroup = {
    id: randomUUID(),
    title,
    color: color || "#808080",
    status: "active",
    updatedAt: now,
  };
  db.groups.push(group);
  saveDb(db);
  return (await getGroups()).find((g) => g.uuid === group.id)!;
}

export async function updateGroup(uuid: string, updates: { title?: string; color?: string }): Promise<Group> {
  const db = loadDb();
  const group = db.groups.find((g) => g.id === uuid);
  if (group) {
    if (updates.title !== undefined) group.title = updates.title;
    if (updates.color !== undefined) group.color = updates.color;
    group.updatedAt = Math.floor(Date.now() / 1000);
    saveDb(db);
  }
  return (await getGroups()).find((g) => g.uuid === uuid)!;
}

export async function deleteGroup(uuid: string): Promise<void> {
  const db = loadDb();
  const activityIds = db.activities.filter((a) => a.groupId === uuid).map((a) => a.id);
  db.entries = db.entries.filter((e) => !activityIds.includes(e.activityId));
  db.activities = db.activities.filter((a) => a.groupId !== uuid);
  db.groups = db.groups.filter((g) => g.id !== uuid);
  saveDb(db);
}

export async function updateGroupStatus(uuid: string, status: ItemStatus): Promise<Group> {
  const db = loadDb();
  const group = db.groups.find((g) => g.id === uuid);
  if (group) {
    group.status = status;
    group.updatedAt = Math.floor(Date.now() / 1000);
    // Cascade to activities and their entries
    const activities = db.activities.filter((a) => a.groupId === uuid);
    for (const activity of activities) {
      activity.status = status;
      const entries = db.entries.filter((e) => e.activityId === activity.id);
      for (const entry of entries) {
        entry.status = status;
      }
    }
    saveDb(db);
  }
  return (await getGroups()).find((g) => g.uuid === uuid)!;
}

// Activities
export async function getActivities(groupUuid: string): Promise<Activity[]> {
  const db = await loadDbAsync();
  const tracking = db.tracking;
  const activities = db.activitiesByGroup.get(groupUuid) || [];
  return activities
    .map((a) => {
      const entries = (db.entriesByActivity.get(a.id) || []).filter((e) => e.status === "active");
      const trackedDuration = entries.reduce((sum, e) => sum + e.duration, 0);
      const lastEntryDate = entries.length
        ? entries
            .map((e) => e.date)
            .sort()
            .reverse()[0]
        : null;
      const isTracking = tracking?.activityId === a.id;
      return {
        uuid: a.id,
        title: a.title,
        status: a.status,
        trackedDuration,
        lastEntryDate,
        lastActivity: a.updatedAt,
        tracking: isTracking ? { startTime: tracking.startTime } : null,
      };
    })
    .sort((a, b) => b.lastActivity - a.lastActivity);
}

export async function createActivity(groupUuid: string, title: string): Promise<Activity> {
  const db = loadDb();
  const now = Math.floor(Date.now() / 1000);
  const activity: StoredActivity = {
    id: randomUUID(),
    groupId: groupUuid,
    title,
    status: "active",
    updatedAt: now,
  };
  db.activities.push(activity);
  const group = db.groups.find((g) => g.id === groupUuid);
  if (group) group.updatedAt = now;
  saveDb(db);
  return (await getActivities(groupUuid)).find((a) => a.uuid === activity.id)!;
}

export async function updateActivity(groupUuid: string, uuid: string, updates: { title?: string }): Promise<Activity> {
  const db = loadDb();
  const activity = db.activities.find((a) => a.id === uuid);
  if (activity) {
    if (updates.title !== undefined) activity.title = updates.title;
    activity.updatedAt = Math.floor(Date.now() / 1000);
    saveDb(db);
  }
  return (await getActivities(groupUuid)).find((a) => a.uuid === uuid)!;
}

export async function deleteActivity(groupUuid: string, uuid: string): Promise<void> {
  const db = loadDb();
  db.entries = db.entries.filter((e) => e.activityId !== uuid);
  db.activities = db.activities.filter((a) => a.id !== uuid);
  saveDb(db);
}

export async function updateActivityStatus(groupUuid: string, uuid: string, status: ItemStatus): Promise<Activity> {
  const db = loadDb();
  const activity = db.activities.find((a) => a.id === uuid);
  if (activity) {
    activity.status = status;
    activity.updatedAt = Math.floor(Date.now() / 1000);
    // Cascade to entries
    const entries = db.entries.filter((e) => e.activityId === uuid);
    for (const entry of entries) {
      entry.status = status;
    }
    saveDb(db);
  }
  return (await getActivities(groupUuid)).find((a) => a.uuid === uuid)!;
}

// Entries
export async function createEntry(
  groupUuid: string,
  activityUuid: string,
  duration: number,
  date: string,
  time: string
): Promise<{ uuid: string; duration: number; title: string }> {
  const db = loadDb();
  const now = Math.floor(Date.now() / 1000);
  const entry: StoredEntry = {
    id: randomUUID(),
    activityId: activityUuid,
    date,
    duration,
    status: "active",
    createdAt: now,
  };
  db.entries.push(entry);

  // Update timestamps
  const activity = db.activities.find((a) => a.id === activityUuid);
  if (activity) activity.updatedAt = now;
  const group = db.groups.find((g) => g.id === groupUuid);
  if (group) group.updatedAt = now;

  saveDb(db);
  return { uuid: entry.id, duration, title: `${date} ${time}` };
}

// Tracking
export async function getTrackingStatus(): Promise<TrackingSession | null> {
  const db = loadDb();
  if (!db.tracking) return null;

  const group = db.groupById.get(db.tracking.groupId);
  const activity = db.activityById.get(db.tracking.activityId);
  if (!group || !activity) return null;

  const entries = db.entriesByActivity.get(activity.id) || [];
  const trackedDuration = entries.filter((e) => e.status === "active").reduce((sum, e) => sum + e.duration, 0);

  return {
    groupUuid: group.id,
    groupTitle: group.title,
    groupColor: group.color,
    activityUuid: activity.id,
    activityTitle: activity.title,
    startTime: db.tracking.startTime,
    trackedDuration,
  };
}

export async function startTracking(groupUuid: string, activityUuid: string): Promise<TrackingSession> {
  const db = loadDb();
  db.tracking = {
    groupId: groupUuid,
    activityId: activityUuid,
    startTime: Math.floor(Date.now() / 1000),
  };
  saveDb(db);
  return (await getTrackingStatus())!;
}

export async function stopTracking(): Promise<{ duration: number; uuid: string }> {
  const session = await getTrackingStatus();
  if (!session) throw new Error("No active tracking session");

  const db = loadDb();
  const now = Math.floor(Date.now() / 1000);
  const duration = now - session.startTime;
  const today = new Date().toISOString().split("T")[0];

  // Create entry
  const entry: StoredEntry = {
    id: randomUUID(),
    activityId: session.activityUuid,
    date: today,
    duration,
    status: "active",
    createdAt: now,
  };
  db.entries.push(entry);

  // Update timestamps
  const activity = db.activities.find((a) => a.id === session.activityUuid);
  if (activity) activity.updatedAt = now;
  const group = db.groups.find((g) => g.id === session.groupUuid);
  if (group) group.updatedAt = now;

  // Clear tracking
  db.tracking = null;
  saveDb(db);

  return { duration, uuid: entry.id };
}

export async function adjustTracking(
  adjustMinutes: number
): Promise<{ activityUuid: string; oldStartTime: number; newStartTime: number }> {
  const db = loadDb();
  if (!db.tracking) throw new Error("No active tracking session");

  const oldStartTime = db.tracking.startTime;
  const newStartTime = oldStartTime + adjustMinutes * 60;
  db.tracking.startTime = newStartTime;
  saveDb(db);

  return { activityUuid: db.tracking.activityId, oldStartTime, newStartTime };
}

// Stats
export async function getDaysStats(): Promise<DaysStats> {
  const db = loadDb();
  const days: DayStats[] = [];
  let totalDuration = 0;

  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const label = i === 0 ? "Today" : i === 1 ? "Yesterday" : date.toLocaleDateString("en-US", { weekday: "long" });

    // Group entries by activity for this date
    const dayEntries = db.entries.filter((e) => e.date === dateStr);
    const activityDurations = new Map<string, number>();
    for (const entry of dayEntries) {
      activityDurations.set(entry.activityId, (activityDurations.get(entry.activityId) || 0) + entry.duration);
    }

    const activities: DayActivity[] = [];
    for (const [activityId, duration] of activityDurations) {
      const activity = db.activityById.get(activityId);
      if (!activity) continue;
      const group = db.groupById.get(activity.groupId);
      if (!group) continue;
      activities.push({
        activityTitle: activity.title,
        groupTitle: group.title,
        groupUuid: group.id,
        activityUuid: activity.id,
        duration,
      });
    }
    activities.sort((a, b) => b.duration - a.duration);

    const duration = activities.reduce((sum, a) => sum + a.duration, 0);
    totalDuration += duration;

    if (duration > 0) {
      days.push({ date: dateStr, label, duration, activities });
    }
  }

  return { totalDuration, days };
}

export async function getRecentActivities(): Promise<RecentActivity[]> {
  const db = loadDb();

  // Get unique activities from recent entries
  const seen = new Set<string>();
  const recent: RecentActivity[] = [];

  const sortedEntries = [...db.entries].sort((a, b) => b.createdAt - a.createdAt);
  for (const entry of sortedEntries) {
    if (seen.has(entry.activityId)) continue;
    seen.add(entry.activityId);

    const activity = db.activityById.get(entry.activityId);
    if (!activity) continue;
    const group = db.groupById.get(activity.groupId);
    if (!group) continue;

    recent.push({
      groupUuid: group.id,
      groupTitle: group.title,
      activityUuid: activity.id,
      activityTitle: activity.title,
    });

    if (recent.length >= 5) break;
  }

  return recent;
}

// Entry management
export interface Entry {
  uuid: string;
  activityId: string;
  date: string;
  duration: number;
  status: ItemStatus;
  createdAt: number;
}

export async function getEntries(activityUuid: string): Promise<Entry[]> {
  const db = await loadDbAsync();
  const entries = db.entriesByActivity.get(activityUuid) || [];
  return entries
    .filter((e) => e.status === "active")
    .map((e) => ({
      uuid: e.id,
      activityId: e.activityId,
      date: e.date,
      duration: e.duration,
      status: e.status,
      createdAt: e.createdAt,
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function updateEntry(entryUuid: string, updates: { duration?: number; date?: string }): Promise<void> {
  const db = loadDb();
  const entry = db.entries.find((e) => e.id === entryUuid);
  if (entry) {
    if (updates.duration !== undefined) entry.duration = updates.duration;
    if (updates.date !== undefined) entry.date = updates.date;
    saveDb(db);
  }
}

export async function deleteEntry(entryUuid: string): Promise<void> {
  const db = loadDb();
  db.entries = db.entries.filter((e) => e.id !== entryUuid);
  saveDb(db);
}
