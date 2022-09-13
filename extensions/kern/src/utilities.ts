import type { Session } from "./types";
import { runAppleScript } from "run-applescript";
import { LocalStorage, showToast, Toast, environment } from "@raycast/api";

/**
 * CONSTANTS
 */
export const STORAGEKEY = "sessionRecords";

/**
 * Shows a MacOS notification banner. The title is bold at the top, below the subtitle and at the bottom the message.
 */
export const showOsNotificiation = async ({
  message,
  title,
  subtitle,
  soundName,
}: {
  message: string;
  title?: string;
  subtitle?: string;
  soundName?: string;
}) =>
  runAppleScript(
    `display notification "${message}" ${title ? 'with title "' + title + '"' : ""} ${
      subtitle ? 'subtitle "' + subtitle + '"' : ""
    } ${soundName ? 'sound name "' + soundName + '"' : ""}`
  );

/**
 * Generate a random 6 digit id based on Math.random() and Date.now().
 */
export const generateId = () => {
  return Number(String(Math.floor(Math.random() * Date.now())).slice(0, 6));
};

export const readableDuration = (duration: number) => {
  const seconds = Math.floor(duration / 1000);

  if (seconds < 60) {
    return `${seconds}sec`;
  } else {
    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) {
      return `${minutes}min`;
    } else {
      const hours = Math.floor(minutes / 60);
      return `${hours}hrs`;
    }
  }
};

export const groupByDate = (sessionRecords: Session[]) =>
  sessionRecords
    ?.sort((a, b) => b.startTime - a.startTime)
    .reduce<{ [key: string]: Session[] }>((group, sessionRecord) => {
      const { startTime } = sessionRecord;

      // This produces the wrong date. Don't know why.
      const localeDateString = new Date(startTime).toLocaleDateString();

      group[localeDateString] = group[localeDateString] ?? [];
      group[localeDateString].push(sessionRecord);

      return group;
    }, {}) ?? {};

export const endSession = async () => {
  /** Read existing records from LocalStorage */
  const storedSessionRecords = await LocalStorage.getItem<string>(STORAGEKEY);

  if (!storedSessionRecords) {
    return { error: "There is no session!" };
  }

  try {
    const sessionRecords = JSON.parse(storedSessionRecords) as Session[];

    console.log(sessionRecords);
    const latestSession = sessionRecords.pop();
    console.log(latestSession);

    if (latestSession && !latestSession.endTime) {
      const currentDate = Date.now();

      latestSession.endTime = currentDate;
      latestSession.duration = currentDate - latestSession.startTime;

      LocalStorage.setItem(STORAGEKEY, JSON.stringify([...sessionRecords, latestSession]));
      console.log([...sessionRecords, latestSession].slice(-3));
      return { session: latestSession };
    } else return { error: "No session to close!" };
  } catch (error) {
    return { error };
  }
};

/** Just simple async setTimout. */
export const sessionFinished = (duration: number) => new Promise((resolve) => setTimeout(resolve, duration));

export const handleError = async (message: string) => {
  log("error", message);
  await showToast({
    title: "🫠",
    message,
    style: Toast.Style.Failure,
  });
};

export const log = (type: "info" | "warn" | "error", message: string) =>
  environment.isDevelopment && console[type](`[Kern]: ${message}`);
