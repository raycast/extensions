import {
  getPreferenceValues,
  LocalStorage,
  open,
  openExtensionPreferences,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import { writeFile } from "fs/promises";
import { dirname, join } from "path";

export type Timer = {
  id: string;
  name: string | null;
  tag?: string;
  start: number;
  end: number | null;
};

export type TimerList = {
  [key: string]: Timer;
};

export async function startTimer(name: string | null = null, tag?: string): Promise<Timer> {
  await stopTimer();

  const timerId = generateTimerId();
  const timers = await getTimers();

  const timer: Timer = {
    id: timerId,
    name: name,
    tag,
    start: new Date().getTime(),
    end: null,
  };

  timers[timerId] = timer;

  await LocalStorage.setItem("projecttimer.timers", JSON.stringify(timers));
  await LocalStorage.setItem("projecttimer.runningTimer", timerId);

  return timer;
}

export async function stopTimer(): Promise<Timer | null> {
  const timerId = await runningTimerId();

  if (!timerId) {
    return null;
  }

  const timers = await getTimers();
  if (!timers[timerId]) {
    return null;
  }

  timers[timerId].end = new Date().getTime();

  await LocalStorage.setItem("projecttimer.timers", JSON.stringify(timers));
  await LocalStorage.removeItem("projecttimer.runningTimer");

  return timers[timerId];
}

export async function editTimer(timer: Timer): Promise<Timer | null> {
  // Disallow setting end time before start time.
  if (timer.end != null && timer.end <= timer.start) {
    return null;
  }

  const timers = await getTimers();
  // Don't allow editing a running timer.
  const currentTimerId = await runningTimerId();
  if (!timers[timer.id] || currentTimerId === timer.id) {
    return null;
  }

  timers[timer.id].name = timer.name;
  timers[timer.id].start = timer.start;
  timers[timer.id].end = timer.end;
  timers[timer.id].tag = timer.tag;

  await LocalStorage.setItem("projecttimer.timers", JSON.stringify(timers));

  return timer;
}

export async function runningTimerId(): Promise<string | null> {
  const id = await LocalStorage.getItem<string>("projecttimer.runningTimer");
  if (!id) {
    return null;
  }

  return id;
}

export async function getTimers(): Promise<TimerList> {
  const json = await LocalStorage.getItem<string>("projecttimer.timers");
  if (!json) {
    return {};
  }

  return JSON.parse(json);
}

export function getDuration(timer: Timer): number {
  const end = timer.end || new Date().getTime();
  return end - timer.start;
}

export function formatDuration(duration: number): string {
  if (!duration) {
    return "-";
  }

  const seconds = Math.floor(duration / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  return `${hours.toString().padStart(2, "0")}:${(minutes % 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export function getTimersByDateRange(timers: Timer[], startDate: Date, endDate: Date): Timer[] {
  const startMs = startDate.getTime();
  const endMs = endDate.getTime();
  return timers.filter((timer) => timer.start >= startMs && timer.start <= endMs);
}

export function groupTimersByProject(timers: Timer[]): Map<string, { totalDuration: number; count: number }> {
  const groups = new Map<string, { totalDuration: number; count: number }>();
  for (const timer of timers) {
    const name = timer.name || "Unnamed timer";
    const existing = groups.get(name) || { totalDuration: 0, count: 0 };
    existing.totalDuration += getDuration(timer);
    existing.count += 1;
    groups.set(name, existing);
  }
  return groups;
}

export function groupTimersByDay(timers: Timer[]): Map<string, Timer[]> {
  const groups = new Map<string, Timer[]>();
  for (const timer of timers) {
    const date = new Date(timer.start);
    const dayKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
    const existing = groups.get(dayKey) || [];
    existing.push(timer);
    groups.set(dayKey, existing);
  }
  return groups;
}

export function formatDateLabel(dayKey: string): string {
  const date = new Date(dayKey + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dateCheck = new Date(date);
  dateCheck.setHours(0, 0, 0, 0);

  if (dateCheck.getTime() === today.getTime()) return "Today";
  if (dateCheck.getTime() === yesterday.getTime()) return "Yesterday";
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function formatISOLocal(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function generateTimerId(): string {
  return Math.random().toString(36).substring(2);
}

export async function importTimersFromCSV(csvContent: string): Promise<number> {
  const lines = csvContent.trim().split("\n");
  if (lines.length < 2) return 0;

  const { commaReplacement } = getPreferenceValues<ExtensionPreferences>();
  const header = lines[0];
  const timers = await getTimers();
  let imported = 0;
  let skipped = 0;

  // Detect CSV format by header
  const isNewFormat = header.includes("start_unix");
  const isOldFormat = header.startsWith("id,name,tag,start,end");

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parse (handles commas within the constraints of the export format)
    const parts = line.split(",");
    if (parts.length < 5) continue;

    let id: string, name: string, tag: string, start: number, end: number;

    if (isNewFormat) {
      // New format: id,name,tag,start_unix,end_unix,start_datetime,end_datetime,...
      id = parts[0];
      name = parts[1];
      tag = parts[2];
      start = parseInt(parts[3]);
      end = parseInt(parts[4]);
    } else if (isOldFormat) {
      // Old format: id,name,tag,start,end,duration,formatted
      id = parts[0];
      name = parts[1];
      tag = parts[2];
      start = parseInt(parts[3]);
      end = parseInt(parts[4]);
    } else {
      continue;
    }

    if (isNaN(start) || (!isNaN(end) && end <= 0)) {
      skipped++;
      console.warn(`Import: skipped row ${i + 1} — invalid start/end values`);
      continue;
    }

    // Skip if this timer already exists
    if (timers[id]) continue;

    // Reverse comma replacement applied during export
    if (commaReplacement) {
      name = name.replaceAll(commaReplacement, ",");
      tag = tag.replaceAll(commaReplacement, ",");
    }

    timers[id] = {
      id,
      name: name || null,
      tag: tag || undefined,
      start,
      end: isNaN(end) || end === 0 ? null : end,
    };
    imported++;
  }

  await LocalStorage.setItem("projecttimer.timers", JSON.stringify(timers));
  if (skipped > 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: `${skipped} row(s) skipped`,
      message: "Some rows had invalid data (possibly commas in names/tags)",
    });
  }
  return imported;
}

export async function deleteTimer(timerId: string): Promise<TimerList> {
  const timers = await getTimers();
  delete timers[timerId];

  await LocalStorage.setItem("projecttimer.timers", JSON.stringify(timers));
  const currentTimerId = await runningTimerId();
  if (currentTimerId === timerId) {
    await LocalStorage.removeItem("projecttimer.runningTimer");
  }

  return timers;
}

export async function exportTimers() {
  const { exportDirectory, commaReplacement } = getPreferenceValues<ExtensionPreferences>();
  if (!exportDirectory) {
    await showToast({
      title: "Export directory not set",
      message: "Please set the export directory in the extension preferences",
      style: Toast.Style.Failure,
      primaryAction: {
        title: "Open Preferences",
        onAction: () => {
          openExtensionPreferences();
        },
      },
    });
    return;
  }

  const toast = await showToast(Toast.Style.Animated, "Fetching Timers");
  const timers = await getTimers();
  toast.title = "Exporting CSV";
  const csv =
    "id,name,tag,start_unix,end_unix,start_datetime,end_datetime,duration_ms,duration_formatted,duration_hours\n" +
    Object.values(timers)
      .map((timer) => {
        const duration = getDuration(timer);
        const durationHours = (duration / 3600000).toFixed(2);
        const name = (timer.name || "").replaceAll(",", commaReplacement);
        const tag = (timer.tag || "").replaceAll(",", commaReplacement);
        return [
          timer.id,
          name,
          tag,
          timer.start,
          timer.end || "",
          formatISOLocal(timer.start),
          timer.end ? formatISOLocal(timer.end) : "",
          duration,
          formatDuration(duration),
          durationHours,
        ].join(",");
      })
      .join("\n");

  const file = join(exportDirectory, `projecttimer.runningTimer-${new Date().getTime()}.csv`);
  try {
    await writeFile(file, csv, "utf8");
    toast.message = file;
    toast.style = Toast.Style.Success;
    toast.title = "Exported CSV";
    toast.primaryAction = {
      title: getFileManagerActionTitle(),
      async onAction() {
        await revealExportedFile(file);
      },
    };
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Export failed";
    toast.message = `${error}`;
  }
}

const isMacOS = process.platform === "darwin";

function getFileManagerActionTitle(): string {
  return isMacOS ? "Show in Finder" : "Open File Location";
}

async function revealExportedFile(file: string): Promise<void> {
  if (isMacOS) {
    await showInFinder(file);
    return;
  }

  await open(dirname(file));
}
