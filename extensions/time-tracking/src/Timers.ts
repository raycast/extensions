import {
  getPreferenceValues,
  LocalStorage,
  openExtensionPreferences,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import { writeFile } from "fs/promises";
import { join } from "path";

export type Timer = {
  id: string;
  name: string | null;
  start: number;
  end: number | null;
};

export type TimerList = {
  [key: string]: Timer;
};

export async function startTimer(name: string | null = null): Promise<Timer> {
  await stopTimer();

  const timerId = generateTimerId();
  const timers = await getTimers();

  const timer: Timer = {
    id: timerId,
    name: name,
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

function generateTimerId(): string {
  return Math.random().toString(36).substring(2);
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
  const exportDirectory = getPreferenceValues<ExtensionPreferences>().exportDirectory;
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
    "id,name,start,end,duration,formatted\n" +
    Object.values(timers)
      .map((timer) => {
        const duration = getDuration(timer);
        return [...Object.values(timer), duration, formatDuration(duration)].join();
      })
      .join("\n");

  const file = join(exportDirectory, `projecttimer.runningTimer-${new Date().getTime()}.csv`);
  try {
    await writeFile(file, csv, "utf8");
    toast.message = file;
    toast.style = Toast.Style.Success;
    toast.title = "Exported CSV";
    toast.primaryAction = {
      title: "Show in Finder",
      async onAction() {
        await showInFinder(file);
      },
    };
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Export failed";
    toast.message = `${error}`;
  }
}
