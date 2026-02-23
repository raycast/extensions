import { environment } from "@raycast/api";
import * as fs from "fs";
import * as path from "path";

export interface TimeEntry {
  client: string;
  startTime: Date;
  endTime?: Date;
  durationMinutes?: number;
}

export interface ActiveTracking {
  client: string;
  startTime: Date;
  lastActivityTime: Date;
}

export interface IdleState {
  isPending: boolean;
  pauseTime: Date;
  client: string;
  originalStartTime: Date;
  lastActivityTime: Date;
}

const STORAGE_DIR = environment.supportPath;
const ENTRIES_FILE = path.join(STORAGE_DIR, "time-entries.csv");
const ACTIVE_FILE = path.join(STORAGE_DIR, "active-tracking.json");
const IDLE_FILE = path.join(STORAGE_DIR, "idle-state.json");

export class TimeTracker {
  constructor() {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }

    if (!fs.existsSync(ENTRIES_FILE)) {
      fs.writeFileSync(
        ENTRIES_FILE,
        "client,startTime,endTime,durationMinutes\n",
      );
    }
  }

  getActiveTracking(): ActiveTracking | null {
    if (!fs.existsSync(ACTIVE_FILE)) {
      return null;
    }

    try {
      const data = fs.readFileSync(ACTIVE_FILE, "utf-8");
      const active = JSON.parse(data);
      return {
        ...active,
        startTime: new Date(active.startTime),
        lastActivityTime: active.lastActivityTime
          ? new Date(active.lastActivityTime)
          : new Date(active.startTime),
      };
    } catch (error) {
      return null;
    }
  }

  startTracking(client: string): {
    previousClient?: string;
    newClient: string;
    startTime: Date;
  } {
    const active = this.getActiveTracking();
    const now = new Date();

    if (active) {
      this.stopTracking();
    }

    const newActive: ActiveTracking = {
      client,
      startTime: now,
      lastActivityTime: now,
    };

    fs.writeFileSync(ACTIVE_FILE, JSON.stringify(newActive, null, 2));

    return {
      previousClient: active?.client,
      newClient: client,
      startTime: now,
    };
  }

  stopTracking(): TimeEntry | null {
    return this.stopTrackingWithEndTime(new Date());
  }

  stopTrackingWithEndTime(endTime: Date): TimeEntry | null {
    const active = this.getActiveTracking();

    if (!active) {
      return null;
    }

    const actualMinutes = Math.round(
      (endTime.getTime() - active.startTime.getTime()) / 60000,
    );
    const durationMinutes = this.roundDuration(actualMinutes);

    const entry: TimeEntry = {
      client: active.client,
      startTime: active.startTime,
      endTime,
      durationMinutes,
    };

    this.appendEntry(entry);

    if (fs.existsSync(ACTIVE_FILE)) {
      fs.unlinkSync(ACTIVE_FILE);
    }

    return entry;
  }

  discardActiveTracking(): void {
    if (fs.existsSync(ACTIVE_FILE)) {
      fs.unlinkSync(ACTIVE_FILE);
    }
  }

  private appendEntry(entry: TimeEntry): void {
    const row = `"${entry.client}","${entry.startTime.toISOString()}","${entry.endTime?.toISOString()}",${entry.durationMinutes}\n`;
    fs.appendFileSync(ENTRIES_FILE, row);
  }

  getAllEntries(): TimeEntry[] {
    if (!fs.existsSync(ENTRIES_FILE)) {
      return [];
    }

    const content = fs.readFileSync(ENTRIES_FILE, "utf-8");
    const lines = content.replace(/\r/g, "").trim().split("\n").slice(1); // Skip header

    return lines
      .filter((line) => line.trim().length > 0)
      .map((line): TimeEntry | null => {
        // Support both quoted ("val","val") and unquoted (val,val) CSV fields
        const quoted = line.match(/"([^"]*)","([^"]*)","([^"]*)",(\d+)/);
        if (quoted) {
          return {
            client: quoted[1],
            startTime: new Date(quoted[2]),
            endTime: new Date(quoted[3]),
            durationMinutes: parseInt(quoted[4], 10),
          };
        }
        const unquoted = line.match(/^([^,]+),([^,]+),([^,]+),(\d+)$/);
        if (!unquoted) return null;

        return {
          client: unquoted[1],
          startTime: new Date(unquoted[2]),
          endTime: new Date(unquoted[3]),
          durationMinutes: parseInt(unquoted[4], 10),
        };
      })
      .filter((entry): entry is TimeEntry => entry !== null);
  }

  getTodayEntries(): TimeEntry[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.getAllEntries().filter((entry) => {
      const entryDate = new Date(entry.startTime);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() === today.getTime();
    });
  }

  getEntriesByDateRange(startDate: Date, endDate: Date): TimeEntry[] {
    return this.getAllEntries().filter((entry) => {
      const entryDate = new Date(entry.startTime);
      return entryDate >= startDate && entryDate <= endDate;
    });
  }

  getSummaryByClient(entries: TimeEntry[]): Map<string, number> {
    const summary = new Map<string, number>();

    for (const entry of entries) {
      const current = summary.get(entry.client) || 0;
      summary.set(entry.client, current + (entry.durationMinutes || 0));
    }

    return summary;
  }

  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours === 0) {
      return `${mins}m`;
    }

    return `${hours}h ${mins}m`;
  }

  // Round duration to 15-minute billing increments
  private roundDuration(minutes: number): number {
    // If 5 minutes or less, keep as is (no minimum billing)
    if (minutes <= 5) {
      return minutes;
    }

    // If more than 5 minutes, round up to next 15-minute increment
    // 6-15 → 15, 16-30 → 30, 31-45 → 45, etc.
    return Math.ceil(minutes / 15) * 15;
  }

  // Activity tracking methods
  updateActivity(): void {
    const active = this.getActiveTracking();
    if (!active) return;

    active.lastActivityTime = new Date();
    fs.writeFileSync(ACTIVE_FILE, JSON.stringify(active, null, 2));
  }

  getIdleMinutes(): number {
    const active = this.getActiveTracking();
    if (!active) return 0;

    const now = new Date();
    const idleMs = now.getTime() - active.lastActivityTime.getTime();
    return Math.floor(idleMs / 60000);
  }

  isBusinessHours(): boolean {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    const hour = now.getHours();

    // Monday-Friday (1-5) and 9 AM - 6 PM
    return day >= 1 && day <= 5 && hour >= 9 && hour < 18;
  }

  // Idle state management
  getIdleState(): IdleState | null {
    if (!fs.existsSync(IDLE_FILE)) {
      return null;
    }

    try {
      const data = fs.readFileSync(IDLE_FILE, "utf-8");
      const idle = JSON.parse(data);
      return {
        ...idle,
        pauseTime: new Date(idle.pauseTime),
        originalStartTime: new Date(idle.originalStartTime),
        lastActivityTime: new Date(idle.lastActivityTime),
      };
    } catch (error) {
      return null;
    }
  }

  setIdleState(state: IdleState): void {
    fs.writeFileSync(IDLE_FILE, JSON.stringify(state, null, 2));
  }

  clearIdleState(): void {
    if (fs.existsSync(IDLE_FILE)) {
      fs.unlinkSync(IDLE_FILE);
    }
  }

  // Idle detection and handling
  pauseTrackingForIdle(): IdleState | null {
    const active = this.getActiveTracking();
    if (!active) return null;

    const now = new Date();
    const idleState: IdleState = {
      isPending: true,
      pauseTime: now,
      client: active.client,
      originalStartTime: active.startTime,
      lastActivityTime: active.lastActivityTime,
    };

    // Save idle state
    this.setIdleState(idleState);

    // Remove active tracking
    if (fs.existsSync(ACTIVE_FILE)) {
      fs.unlinkSync(ACTIVE_FILE);
    }

    return idleState;
  }

  resumeFromIdle(idleState: IdleState): void {
    const now = new Date();

    // Create entry from original start to pause time
    const firstActualMinutes = Math.round(
      (idleState.pauseTime.getTime() - idleState.originalStartTime.getTime()) /
        60000,
    );
    const firstEntry: TimeEntry = {
      client: idleState.client,
      startTime: idleState.originalStartTime,
      endTime: idleState.pauseTime,
      durationMinutes: this.roundDuration(firstActualMinutes),
    };
    this.appendEntry(firstEntry);

    // Create entry from pause time to now (counting the paused period)
    const secondActualMinutes = Math.round(
      (now.getTime() - idleState.pauseTime.getTime()) / 60000,
    );
    const secondEntry: TimeEntry = {
      client: idleState.client,
      startTime: idleState.pauseTime,
      endTime: now,
      durationMinutes: this.roundDuration(secondActualMinutes),
    };
    this.appendEntry(secondEntry);

    // Restart active tracking from now
    const newActive: ActiveTracking = {
      client: idleState.client,
      startTime: now,
      lastActivityTime: now,
    };
    fs.writeFileSync(ACTIVE_FILE, JSON.stringify(newActive, null, 2));

    // Clear idle state
    this.clearIdleState();
  }

  stopFromIdle(idleState: IdleState): void {
    // Create entry from original start to pause time only (not counting paused period)
    const actualMinutes = Math.round(
      (idleState.pauseTime.getTime() - idleState.originalStartTime.getTime()) /
        60000,
    );
    const entry: TimeEntry = {
      client: idleState.client,
      startTime: idleState.originalStartTime,
      endTime: idleState.pauseTime,
      durationMinutes: this.roundDuration(actualMinutes),
    };
    this.appendEntry(entry);

    // Clear idle state
    this.clearIdleState();
  }

  // Manual entry management
  addEntry(client: string, startTime: Date, endTime: Date): TimeEntry {
    const actualMinutes = Math.round(
      (endTime.getTime() - startTime.getTime()) / 60000,
    );
    const durationMinutes = this.roundDuration(actualMinutes);

    const entry: TimeEntry = {
      client,
      startTime,
      endTime,
      durationMinutes,
    };

    this.appendEntry(entry);
    return entry;
  }

  updateEntry(originalEntry: TimeEntry, updatedEntry: TimeEntry): void {
    const entries = this.getAllEntries();
    const updatedEntries = entries.map((entry) => {
      // Match by client, startTime, and endTime
      if (
        entry.client === originalEntry.client &&
        entry.startTime.getTime() === originalEntry.startTime.getTime() &&
        entry.endTime?.getTime() === originalEntry.endTime?.getTime()
      ) {
        return updatedEntry;
      }
      return entry;
    });

    this.saveAllEntries(updatedEntries);
  }

  deleteEntry(entryToDelete: TimeEntry): void {
    const entries = this.getAllEntries();
    const filteredEntries = entries.filter((entry) => {
      // Match by client, startTime, and endTime
      return !(
        entry.client === entryToDelete.client &&
        entry.startTime.getTime() === entryToDelete.startTime.getTime() &&
        entry.endTime?.getTime() === entryToDelete.endTime?.getTime()
      );
    });

    this.saveAllEntries(filteredEntries);
  }

  private saveAllEntries(entries: TimeEntry[]): void {
    // Rewrite entire CSV file
    let content = "client,startTime,endTime,durationMinutes\n";
    for (const entry of entries) {
      content += `"${entry.client}","${entry.startTime.toISOString()}","${entry.endTime?.toISOString()}",${entry.durationMinutes}\n`;
    }
    fs.writeFileSync(ENTRIES_FILE, content);
  }
}
