import { LocalStorage } from "@raycast/api";

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
