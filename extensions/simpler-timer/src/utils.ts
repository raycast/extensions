import { environment } from "@raycast/api";
import fs from "fs";
import path from "path";

export interface TimerTask {
  id: string;
  pid: number;
  createdAt: number;
  duration: number; // in seconds
  originalInput: string;
  content: string;
  dueTime: number;
}

const TIMERS_FILE = path.join(environment.supportPath, "simple_timers.json");

function ensureDirectoryExistence(filePath: string) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

export function getTimers(): TimerTask[] {
  if (!fs.existsSync(TIMERS_FILE)) {
    return [];
  }
  try {
    const data = fs.readFileSync(TIMERS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to read timers:", error);
    return [];
  }
}

export function saveTimers(timers: TimerTask[]) {
  ensureDirectoryExistence(TIMERS_FILE);
  fs.writeFileSync(TIMERS_FILE, JSON.stringify(timers, null, 2));
}

export function addTimer(task: TimerTask) {
  const timers = getTimers();
  timers.push(task);
  saveTimers(timers);
}

export function removeTimer(id: string) {
  const timers = getTimers();
  const task = timers.find((t) => t.id === id);
  if (task) {
    try {
      // Kill the process group
      // The minus sign kills the process group with ID = task.pid
      process.kill(-task.pid, "SIGTERM");
    } catch {
      console.log(`Process ${task.pid} not found or already terminated.`);
    }
  }
  const newTimers = timers.filter((t) => t.id !== id);
  saveTimers(newTimers);
}

export function refreshTimers(): TimerTask[] {
  const timers = getTimers();
  const activeTimers = timers.filter((task) => {
    // Check if process is still running
    try {
      // process.kill(pid, 0) returns true if process exists, throws if not
      // Note: We check the group leader pid
      process.kill(task.pid, 0);

      // Also check if time has passed (just in case process is stuck or pid reused?)
      // Actually, if the process is still there, it's probably fine to keep it.
      // But if it's way past due time, maybe we should remove it?
      // Let's trust the process existence for now, but maybe add a sanity check.
      if (Date.now() > task.dueTime + 5000) {
        // If it's 5 seconds past due time, it should be done.
        // If process is still there, maybe it's a zombie or something else.
        // But let's assume if it's running, it's valid.
        // Wait, if the sleep finished, the process might be gone.
        return false;
      }
      return true;
    } catch {
      return false;
    }
  });

  if (activeTimers.length !== timers.length) {
    saveTimers(activeTimers);
  }
  return activeTimers;
}

export function parseTimerInput(input: string): {
  durationInSeconds: number;
  originalTimePart: string;
  content: string;
} | null {
  const trimmedInput = input.trim();
  // Regex to match the time part.
  // It matches one or more groups of digits followed by s, m, or h.
  // It does NOT allow spaces between time units.
  // Content must be separated by at least one space if present.
  const timePartRegex = /^((?:\d+[smh])+)(?:\s+(.*))?$/i;
  const match = trimmedInput.match(timePartRegex);

  if (!match) {
    return null;
  }

  const [, timePart, rest] = match;

  let totalSeconds = 0;
  const unitRegex = /(\d+)([smh])/gi;
  let unitMatch;

  while ((unitMatch = unitRegex.exec(timePart)) !== null) {
    const value = parseInt(unitMatch[1], 10);
    const unit = unitMatch[2].toLowerCase();

    if (unit === "h") {
      totalSeconds += value * 3600;
    } else if (unit === "m") {
      totalSeconds += value * 60;
    } else if (unit === "s") {
      totalSeconds += value;
    }
  }

  const content = rest ? rest.trim() : "Timer Done";

  return {
    durationInSeconds: totalSeconds,
    originalTimePart: timePart.trim(),
    content: content || "Timer Done",
  };
}
