import { environment } from "@raycast/api";
import { connect } from "node:net";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * ToneCue's local control socket. Without the app there is nothing listening, and every command fails.
 * While developing the extension, a local dev build of the app ("ToneCue Dev") has its own socket and is tried first.
 */
const SOCKET_PATHS = (environment.isDevelopment ? ["ToneCue Dev", "ToneCue"] : ["ToneCue"]).map((folder) =>
  join(homedir(), "Library/Application Support", folder, "control.sock"),
);
export const APP_BUNDLE_ID = "com.ingojurz.tonecue";
export const DOWNLOAD_URL = "https://github.com/4IngoJ/tonecue/releases/latest";

export interface Scene {
  id: string;
  name: string;
  summary: string;
  fallback: boolean;
  active: boolean;
  hotkey?: string;
  /** Devices the scene would use right now; absent when none of its devices is connected. */
  input?: string;
  output?: string;
}

export interface Device {
  uid: string;
  name: string;
  current: boolean;
}

export interface HistoryItem {
  id: string;
  date: string;
  source: "rule" | "hand" | "system";
  headline: string;
  input?: string;
  output?: string;
  undoable: boolean;
}

export interface State {
  protocolVersion: number;
  version: string;
  automationEnabled: boolean;
  paused: boolean;
  muted: boolean;
  /** 0 to 1; absent when the output has no volume control. */
  volume?: number;
  manual: boolean;
  reason?: string;
  scenes: Scene[];
  inputs: Device[];
  outputs: Device[];
}

export type Request =
  | { cmd: "state" }
  | { cmd: "history"; limit?: number }
  | { cmd: "applyScene"; scene: string }
  | { cmd: "automation"; action: "on" | "off" | "toggle" }
  | { cmd: "resume" }
  | { cmd: "mute"; action: "on" | "off" | "toggle" };

interface Reply {
  ok: boolean;
  error?: string;
  state?: State;
  history?: HistoryItem[];
}

/** The app is not running (or is too old to have the socket). */
export class NotRunningError extends Error {
  constructor() {
    super("ToneCue is not running. Open the ToneCue menu bar app first (version 2.1 or later).");
  }
}

/** ToneCue understood the request and said no. */
export class RefusedError extends Error {}

function sendTo(path: string, request: Request): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const socket = connect(path);
    let buffer = "";
    socket.setTimeout(5000, () => socket.destroy(new Error("ToneCue did not answer in time.")));
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
        reject(new Error("ToneCue sent an answer that could not be read."));
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
  if (!reply.ok) throw new RefusedError(reply.error ?? "ToneCue refused the request.");
  return reply;
}

export async function getState(): Promise<State> {
  return (await call({ cmd: "state" })).state as State;
}

export async function getHistory(limit = 50): Promise<HistoryItem[]> {
  return (await call({ cmd: "history", limit })).history ?? [];
}

/** Runs a command and returns the state after it. */
export async function act(request: Request): Promise<State> {
  return (await call(request)).state as State;
}

/** The scene a typed name means: exact, then prefix, then substring, case-insensitive; it must be unambiguous. */
export function findScene(scenes: Scene[], query: string): Scene {
  const q = query.trim().toLowerCase();
  for (const match of [
    (s: Scene) => s.name.toLowerCase() === q,
    (s: Scene) => s.name.toLowerCase().startsWith(q),
    (s: Scene) => s.name.toLowerCase().includes(q),
  ]) {
    const found = scenes.filter(match);
    if (found.length === 1) return found[0];
    if (found.length > 1) throw new RefusedError(`"${query}" matches ${found.map((s) => s.name).join(", ")}.`);
  }
  throw new RefusedError(`No scene called "${query}".`);
}

export const sceneLink = (name: string) => `tonecue://scene/${encodeURIComponent(name)}`;
