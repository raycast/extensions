import { environment } from "@raycast/api";
import { connect } from "node:net";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * TalkRemind's local control socket. Without the app there is nothing listening, and every command fails.
 * While developing the extension, a local dev build of the app ("TalkRemind Dev") has its own socket and is tried first.
 */
const SOCKET_PATHS = (environment.isDevelopment ? ["TalkRemind Dev", "TalkRemind"] : ["TalkRemind"]).map((folder) =>
  join(homedir(), "Library/Application Support", folder, "control.sock"),
);
export const APP_BUNDLE_ID = "com.talkremind.app";
export const DOWNLOAD_URL = "https://github.com/4IngoJ/TalkRemind/releases/latest";

export interface State {
  protocolVersion: number;
  version: string;
  paused: boolean;
  /** Paused until further notice; `pausedUntil` is then absent. */
  indefinite: boolean;
  /** ISO 8601. */
  pausedUntil?: string;
  /** Bundle identifiers, sorted. */
  excludedApps: string[];
}

export interface Totals {
  typedWords: number;
  dictatedWords: number;
  /** 0 to 1; absent without words. */
  share?: number;
}

export interface Day extends Totals {
  date: string;
}

export interface Stats {
  today: Totals;
  week: Totals;
  /** Seven days, oldest first. */
  days: Day[];
  /** Absent until enough words were measured. */
  timeSavedThisWeekSeconds?: number;
  remindedToday: { bundleID: string; count: number }[];
}

export interface AppUsage {
  bundleID: string;
  typedWords: number;
  dictatedWords: number;
  /** Absent for an app with only reminders. */
  share?: number;
  typingRuns: number;
  reminders: number;
  remindersFollowed: number;
}

export interface Usage {
  days: number;
  total: Totals;
  /** Oldest first. */
  daily: Day[];
  /** Busiest first. */
  apps: AppUsage[];
}

export interface PauseRequest {
  minutes?: number;
  /** ISO 8601. */
  until?: string;
  preset?: "evening" | "tomorrow";
  indefinitely?: boolean;
}

export type Request =
  | { cmd: "state" }
  | { cmd: "stats" }
  | { cmd: "usage"; days: number }
  | ({ cmd: "pause" } & PauseRequest)
  | { cmd: "resume" }
  | { cmd: "exclude"; bundleID: string; excluded: boolean };

interface Reply {
  ok: boolean;
  error?: string;
  state?: State;
  stats?: Stats;
  usage?: Usage;
}

/** The app is not running (or is too old to have the socket). */
export class NotRunningError extends Error {
  constructor() {
    super("TalkRemind is not running. Open the TalkRemind menu bar app first (version 0.13 or later).");
  }
}

/** TalkRemind understood the request and said no. */
export class RefusedError extends Error {}

function sendTo(path: string, request: Request): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const socket = connect(path);
    let buffer = "";
    socket.setTimeout(5000, () => socket.destroy(new Error("TalkRemind did not answer in time.")));
    socket.on("connect", () => socket.write(JSON.stringify(request) + "\n"));
    socket.setEncoding("utf8");
    socket.on("data", (chunk) => (buffer += chunk));
    socket.on("error", (error: NodeJS.ErrnoException) =>
      reject(error.code === "ENOENT" || error.code === "ECONNREFUSED" ? new NotRunningError() : error),
    );
    socket.on("close", () => {
      try {
        resolve(JSON.parse(buffer));
      } catch {
        reject(new Error("TalkRemind sent an answer that could not be read."));
      }
    });
  });
}

async function send(request: Request): Promise<Reply> {
  for (const path of SOCKET_PATHS.slice(0, -1)) {
    try {
      return await sendTo(path, request);
    } catch (error) {
      if (!(error instanceof NotRunningError)) throw error;
    }
  }
  return sendTo(SOCKET_PATHS[SOCKET_PATHS.length - 1], request);
}

async function call(request: Request): Promise<Reply> {
  const reply = await send(request);
  if (!reply.ok) throw new RefusedError(reply.error ?? "TalkRemind refused the request.");
  return reply;
}

export async function getState(): Promise<State> {
  return (await call({ cmd: "state" })).state as State;
}

export async function getStats(): Promise<Stats> {
  return (await call({ cmd: "stats" })).stats as Stats;
}

export async function getUsage(days: number): Promise<Usage> {
  return (await call({ cmd: "usage", days })).usage as Usage;
}

/** Runs a command and returns the state after it. */
export async function act(request: Request): Promise<State> {
  return (await call(request)).state as State;
}
