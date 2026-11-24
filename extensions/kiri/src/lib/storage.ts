import { LocalStorage } from "@raycast/api";
import { type AccountSummary, type MeResponse } from "./api";
import { type HistoryEntry, parseHistory, parseQueue, type QueueItem } from "./queue";
import { type PendingBreak, parsePendingBreak, parseTimer, type RunningTimer } from "./timer";

/**
 * Everything is kept in Raycast's LocalStorage, which Raycast encrypts and keeps for this
 * extension only. Nothing here is ever logged.
 */
const KEYS = {
  timer: "timer",
  pendingBreak: "pending-break",
  lastFinished: "last-finished-id",
  history: "history",
  queue: "queue",
  connection: "connection",
  pendingConnect: "pending-connect",
  lastSound: "last-sound",
  player: "sound-player",
  callPause: "call-pause",
} as const;

async function readJson(key: string): Promise<unknown> {
  const raw = await LocalStorage.getItem<string>(key);
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  if (value === null || value === undefined) await LocalStorage.removeItem(key);
  else await LocalStorage.setItem(key, JSON.stringify(value));
}

export const getTimer = async (): Promise<RunningTimer | null> => parseTimer(await readJson(KEYS.timer));
export const setTimer = (t: RunningTimer | null) => writeJson(KEYS.timer, t);

export const getPendingBreak = async (now = Date.now()): Promise<PendingBreak | null> =>
  parsePendingBreak(await readJson(KEYS.pendingBreak), now);
export const setPendingBreak = (p: PendingBreak | null) => writeJson(KEYS.pendingBreak, p);

export const getLastFinished = async (): Promise<string> =>
  (await LocalStorage.getItem<string>(KEYS.lastFinished)) ?? "";
export const setLastFinished = (id: string) => LocalStorage.setItem(KEYS.lastFinished, id);

export const getHistory = async (): Promise<HistoryEntry[]> => parseHistory(await readJson(KEYS.history));
export const setHistory = (h: HistoryEntry[]) => writeJson(KEYS.history, h);

export const getQueue = async (): Promise<QueueItem[]> => parseQueue(await readJson(KEYS.queue));
export const setQueue = (q: QueueItem[]) => writeJson(KEYS.queue, q.length ? q : null);

export const getLastSound = async (): Promise<string> => (await LocalStorage.getItem<string>(KEYS.lastSound)) ?? "";
export const setLastSound = (key: string) => LocalStorage.setItem(KEYS.lastSound, key);

export interface Connection {
  token: string;
  /** Random id of this connection; queued blocks only go out with the token they were made under. */
  connectionId: string;
  account: AccountSummary;
  me: MeResponse | null;
  /** When `me` was last loaded. */
  meAt: number;
}

export async function getConnection(): Promise<Connection | null> {
  const v = (await readJson(KEYS.connection)) as Partial<Connection> | null;
  if (!v || typeof v.token !== "string" || !v.token.startsWith("kdt_") || typeof v.connectionId !== "string")
    return null;
  return {
    token: v.token,
    connectionId: v.connectionId,
    account: { name: v.account?.name ?? "", emailHint: v.account?.emailHint ?? "" },
    me: v.me && typeof v.me === "object" ? (v.me as MeResponse) : null,
    meAt: typeof v.meAt === "number" ? v.meAt : 0,
  };
}
export const setConnection = (c: Connection | null) => writeJson(KEYS.connection, c);

export interface PendingConnect {
  deviceCode: string;
  userCode: string;
  verificationUrl: string;
  intervalMs: number;
  expiresAt: number;
  lastPollAt: number;
}

export async function getPendingConnect(): Promise<PendingConnect | null> {
  const v = (await readJson(KEYS.pendingConnect)) as Partial<PendingConnect> | null;
  if (!v || typeof v.deviceCode !== "string" || typeof v.userCode !== "string" || typeof v.expiresAt !== "number")
    return null;
  return {
    deviceCode: v.deviceCode,
    userCode: v.userCode,
    verificationUrl: typeof v.verificationUrl === "string" ? v.verificationUrl : "",
    intervalMs: typeof v.intervalMs === "number" && v.intervalMs > 0 ? v.intervalMs : 5000,
    expiresAt: v.expiresAt,
    lastPollAt: typeof v.lastPollAt === "number" ? v.lastPollAt : 0,
  };
}
export const setPendingConnect = (p: PendingConnect | null) => writeJson(KEYS.pendingConnect, p);

export interface PlayerInfo {
  pid: number;
  key: string;
}
export async function getPlayer(): Promise<PlayerInfo | null> {
  const v = (await readJson(KEYS.player)) as Partial<PlayerInfo> | null;
  return v && typeof v.pid === "number" && typeof v.key === "string" ? { pid: v.pid, key: v.key } : null;
}
export const setPlayer = (p: PlayerInfo | null) => writeJson(KEYS.player, p);

/**
 * Pause-on-call state for one focus block. "paused": Kiri paused it because a call started.
 * "ignore": a microphone was already in use when the block started or was resumed, so Kiri leaves
 * it alone until the microphone is free again.
 */
export interface CallPause {
  timerId: string;
  mode: "paused" | "ignore";
}
export async function getCallPause(): Promise<CallPause | null> {
  const v = (await readJson(KEYS.callPause)) as Partial<CallPause> | null;
  return v && typeof v.timerId === "string" && (v.mode === "paused" || v.mode === "ignore")
    ? { timerId: v.timerId, mode: v.mode }
    : null;
}
export const setCallPause = (c: CallPause | null) => writeJson(KEYS.callPause, c);
