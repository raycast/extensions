import { LocalStorage } from "@raycast/api";
import { ApiError, KiriApi, type MeResponse } from "./api";
import { buildSessionBody, enqueue, flushQueue, type HistoryEntry, markHistory, newId } from "./queue";
import {
  type Connection,
  getConnection,
  getHistory,
  getPendingConnect,
  getQueue,
  type PendingConnect,
  setConnection,
  setHistory,
  setPendingConnect,
  setQueue,
} from "./storage";

/** /api/device/me is loaded again after this long (plan and sounds can change on the site). */
const ME_MAX_AGE = 6 * 60 * 60 * 1000;
/** Extra wait after the server asks to poll more slowly (RFC 8628). */
const SLOW_DOWN_MS = 5000;

/** Forget the connection on this Mac, and the blocks queued for it. History stays. */
export async function forgetConnection(): Promise<void> {
  const c = await getConnection();
  await setConnection(null);
  if (c) {
    const queue = await getQueue();
    const dropped = queue.filter((q) => q.connectionId === c.connectionId).map((q) => q.body.client_block_id);
    await setQueue(queue.filter((q) => q.connectionId !== c.connectionId));
    await setHistory(markHistory(await getHistory(), dropped, "local"));
  }
}

/** Disconnect: revoke the token on Kiri (best effort), then forget it here. */
export async function disconnect(): Promise<void> {
  const c = await getConnection();
  if (c) {
    try {
      await new KiriApi(c.token).revoke();
    } catch {
      // Offline or already revoked: forget it locally anyway. It can also be removed on the site.
    }
  }
  await forgetConnection();
}

/** Load the account's plan and sounds. Forgets the connection when Kiri no longer accepts it. */
export async function refreshMe(force = false): Promise<Connection | null> {
  const c = await getConnection();
  if (!c) return null;
  if (!force && c.me && Date.now() - c.meAt < ME_MAX_AGE) return c;
  try {
    const me = await new KiriApi(c.token).me();
    const next: Connection = {
      ...c,
      me,
      account: me.account.name || me.account.emailHint ? me.account : c.account,
      meAt: Date.now(),
    };
    await setConnection(next);
    return next;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      await forgetConnection();
      return null;
    }
    return c;
  }
}

/** Queue a finished block for the connected account and try to send everything queued. */
export async function queueBlock(entry: HistoryEntry): Promise<{ saved: boolean; kirisEarned: number }> {
  const c = await getConnection();
  if (!c) return { saved: false, kirisEarned: 0 };
  await setQueue(enqueue(await getQueue(), buildSessionBody(entry), c.connectionId));
  const result = await flush();
  return { saved: result.sentIds.includes(entry.id), kirisEarned: result.kirisEarned };
}

/** Background retries of the queue are at most this often. */
const RETRY_EVERY_MS = 60 * 1000;

/** Send queued blocks of the current connection. Never throws. `background` waits a minute between tries. */
export async function flush(background = false): Promise<{ sentIds: string[]; kirisEarned: number }> {
  const none = { sentIds: [], kirisEarned: 0 };
  try {
    const c = await getConnection();
    const queue = await getQueue();
    if (!c || queue.length === 0) return none;
    if (background) {
      const last = Number((await LocalStorage.getItem<string>("last-flush")) ?? 0);
      if (Date.now() - last < RETRY_EVERY_MS) return none;
    }
    await LocalStorage.setItem("last-flush", String(Date.now()));
    const mine = queue.filter((q) => q.connectionId === c.connectionId);
    const others = queue.filter((q) => q.connectionId !== c.connectionId);
    // Blocks of an earlier connection are never sent with this one's token.
    const api = new KiriApi(c.token);
    const result = await flushQueue(mine, (body) => api.postFocusSession(body));
    // Read again: another command may have queued a block while this one was sending.
    const latest = await getQueue();
    const handled = new Set(mine.map((q) => q.body.client_block_id));
    const kept = new Set(result.remaining.map((q) => q.body.client_block_id));
    const merged = [
      ...result.remaining,
      ...latest.filter((q) => !handled.has(q.body.client_block_id) && q.connectionId === c.connectionId),
    ];
    const droppedIds = mine
      .map((q) => q.body.client_block_id)
      .filter((id) => !kept.has(id) && !result.sentIds.includes(id));
    await setQueue(merged);
    let history = await getHistory();
    history = markHistory(history, result.sentIds, "saved");
    history = markHistory(history, droppedIds, "local");
    history = markHistory(
      history,
      others.map((q) => q.body.client_block_id),
      "local",
    );
    await setHistory(history);
    if (result.unauthorized) await forgetConnection();
    return { sentIds: result.sentIds, kirisEarned: result.kirisEarned };
  } catch {
    return none;
  }
}

export type ConnectStep =
  | { step: "waiting"; pending: PendingConnect }
  | { step: "done"; connection: Connection }
  | { step: "denied" }
  | { step: "expired" }
  | { step: "error"; message: string };

/** Ask Kiri for a sign-in code. The caller opens `verificationUrl` in the browser. */
export async function startConnect(): Promise<PendingConnect> {
  const start = await new KiriApi().startDevice();
  const pending: PendingConnect = {
    deviceCode: start.deviceCode,
    userCode: start.userCode,
    verificationUrl: start.verificationUrl,
    intervalMs: Math.max(1, start.intervalSeconds) * 1000,
    expiresAt: Date.now() + start.expiresInSeconds * 1000,
    lastPollAt: Date.now(),
  };
  await setPendingConnect(pending);
  return pending;
}

/**
 * Ask once whether the user has allowed this Mac on the site. Both the Connect screen and the
 * menu bar call it, so it re-reads the stored attempt and respects the poll interval.
 */
export async function pollConnect(): Promise<ConnectStep | null> {
  const pending = await getPendingConnect();
  if (!pending) {
    const c = await getConnection();
    return c ? { step: "done", connection: c } : null;
  }
  const now = Date.now();
  if (now >= pending.expiresAt) {
    await setPendingConnect(null);
    return { step: "expired" };
  }
  if (now - pending.lastPollAt < pending.intervalMs) return { step: "waiting", pending };
  await setPendingConnect({ ...pending, lastPollAt: now });
  let poll;
  try {
    poll = await new KiriApi().pollToken(pending.deviceCode);
  } catch (err) {
    if (err instanceof ApiError && err.retryable) return { step: "waiting", pending };
    await setPendingConnect(null);
    return { step: "error", message: err instanceof ApiError ? err.message : "Something went wrong. Try again." };
  }
  switch (poll.kind) {
    case "pending":
      return { step: "waiting", pending };
    case "slow_down": {
      const slower = { ...pending, lastPollAt: now, intervalMs: pending.intervalMs + SLOW_DOWN_MS };
      await setPendingConnect(slower);
      return { step: "waiting", pending: slower };
    }
    case "denied":
      await setPendingConnect(null);
      return { step: "denied" };
    case "expired": {
      await setPendingConnect(null);
      // Another command may have redeemed the code a moment ago.
      const c = await getConnection();
      return c ? { step: "done", connection: c } : { step: "expired" };
    }
    case "ok": {
      // A new connection replaces an old one; the old token is revoked on Kiri.
      const old = await getConnection();
      if (old) await disconnect();
      const connection: Connection = {
        token: poll.token,
        connectionId: newId(),
        account: poll.account,
        me: null,
        meAt: 0,
      };
      await setConnection(connection);
      await setPendingConnect(null);
      const fresh = await refreshMe(true);
      return { step: "done", connection: fresh ?? connection };
    }
  }
}

export async function cancelConnect(): Promise<void> {
  await setPendingConnect(null);
}

/** Sounds the account may play, in Kiri's order. Without an account only brown noise plays. */
export function playableSounds(me: MeResponse | null): { key: string; label: string }[] {
  if (!me) return [{ key: "brownnoise", label: "Brown Noise" }];
  const list = me.sounds.filter((s) => s.available).map((s) => ({ key: s.key, label: s.label }));
  if (!list.some((s) => s.key === "brownnoise")) list.unshift({ key: "brownnoise", label: "Brown Noise" });
  return list;
}

export function lockedSoundCount(me: MeResponse | null): number {
  return me ? me.sounds.filter((s) => !s.available).length : 0;
}
