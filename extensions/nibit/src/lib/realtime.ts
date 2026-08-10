import { RealtimeClient } from "@supabase/realtime-js";
import { getExtensionConfig } from "./config";
import { getAuthSession } from "./oauth";
import { getSharedClient } from "./client";
import { fetchWithTimeout } from "./fetch";
import { debugLog } from "./logger";
import type { EncryptedPendingMessage } from "./secure";

type InboxUpdateHint = { alreadySynced?: boolean };
type InboxUpdateCallback = (hint?: InboxUpdateHint) => void;

const SSE_RECONNECT_BASE_MS = 1000;
const SSE_RECONNECT_MAX_MS = 30000;
const SSE_CONNECT_TIMEOUT_MS = 15000;
const SSE_READ_TIMEOUT_MS = 60000;

type SseEvent = {
  event: string;
  data: string;
};

function parseSseFrame(frame: string): SseEvent | null {
  let event = "message";
  const data: string[] = [];
  for (const rawLine of frame.split(/\r?\n/)) {
    if (!rawLine || rawLine.startsWith(":")) continue;
    const separator = rawLine.indexOf(":");
    const field = separator === -1 ? rawLine : rawLine.slice(0, separator);
    const value = separator === -1 ? "" : rawLine.slice(separator + 1).replace(/^ /, "");
    if (field === "event") event = value;
    if (field === "data") data.push(value);
  }
  if (data.length === 0) return null;
  return { event, data: data.join("\n") };
}

async function readSseChunk(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  signal: AbortSignal,
): Promise<ReadableStreamReadResult<Uint8Array>> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let abortListener: (() => void) | null = null;
  try {
    return await Promise.race([
      reader.read(),
      new Promise<ReadableStreamReadResult<Uint8Array>>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("Realtime stream timed out waiting for heartbeat")),
          SSE_READ_TIMEOUT_MS,
        );
        abortListener = () => reject(new Error("Realtime stream aborted"));
        signal.addEventListener("abort", abortListener, { once: true });
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
    if (abortListener) signal.removeEventListener("abort", abortListener);
  }
}

async function readSseStream(
  response: Response,
  onEvent: (event: SseEvent) => Promise<void>,
  signal: AbortSignal,
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Realtime stream response body is unavailable.");
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (!signal.aborted) {
      const { value, done } = await readSseChunk(reader, signal);
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() ?? "";
      for (const frame of frames) {
        const event = parseSseFrame(frame);
        if (event) await onEvent(event);
      }
    }
    buffer += decoder.decode();
    const event = parseSseFrame(buffer);
    if (event) await onEvent(event);
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}

function subscribeToApiKeyInboxUpdates(onUpdate: InboxUpdateCallback): () => void {
  const { authBridgeUrl } = getExtensionConfig();
  let cancelled = false;
  let controller: AbortController | null = null;
  let reconnectTimer: NodeJS.Timeout | null = null;
  let attempt = 0;
  let sseDisabled = false;

  const scheduleReconnect = () => {
    if (cancelled) return;
    const delay = Math.min(SSE_RECONNECT_MAX_MS, SSE_RECONNECT_BASE_MS * 2 ** attempt);
    attempt += 1;
    console.warn(`[nibit] inbox realtime: SSE reconnecting in ${delay}ms`);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      void connect();
    }, delay);
  };

  const handleEvent = async (event: SseEvent) => {
    if (event.event === "ready") {
      debugLog("[nibit] inbox realtime: SSE connected");
      // Close the race where messages are inserted after the inbox mounted but before
      // the SSE subscription is fully attached, and heal any Durable Object fanout miss.
      if (!cancelled) onUpdate();
      return;
    }
    if (event.event === "heartbeat") {
      attempt = 0;
      return;
    }
    if (event.event === "error") throw new Error(`Realtime stream reported an error: ${event.data}`);
    if (event.event !== "pending_messages") return;
    const parsed = JSON.parse(event.data) as { messages?: EncryptedPendingMessage[] };
    const messages = Array.isArray(parsed.messages) ? parsed.messages : [];
    if (messages.length === 0) return;
    try {
      await getSharedClient().ingestEncryptedPendingMessages(messages);
      attempt = 0;
      if (!cancelled) onUpdate({ alreadySynced: true });
    } catch (error) {
      console.warn("[nibit] inbox realtime: SSE row ingestion failed; falling back to sync", error);
      if (!cancelled) onUpdate();
    }
  };

  const connect = async () => {
    if (cancelled) return;
    const session = await getAuthSession();
    if (cancelled || !session || session.authType !== "api_key") return;
    controller = new AbortController();
    try {
      debugLog("[nibit] inbox realtime: using API-key SSE");
      const response = await fetchWithTimeout(
        `${authBridgeUrl.replace(/\/+$/, "")}/v1/realtime/pushes`,
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            Accept: "text/event-stream",
          },
          signal: controller.signal,
        },
        SSE_CONNECT_TIMEOUT_MS,
      );
      if (!response.ok) {
        if (response.status === 403) {
          sseDisabled = true;
          console.warn("[nibit] inbox realtime: SSE disabled after permanent 403 response; polling remains active");
          return;
        }
        // 401s are retried because they may be transient edge/auth hiccups; if the cached API key is truly revoked,
        // polling/manual sync will surface the auth failure while this SSE loop backs off.
        throw new Error(`Realtime stream failed (${response.status})`);
      }
      await readSseStream(response, handleEvent, controller.signal);
    } catch (error) {
      if (!cancelled) console.warn("[nibit] inbox realtime: SSE stream failed", error);
    } finally {
      controller = null;
      if (!sseDisabled) scheduleReconnect();
    }
  };

  void connect();

  return () => {
    cancelled = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = null;
    controller?.abort();
    controller = null;
  };
}

/**
 * Subscribe to real-time INSERT events on pending_messages for the current
 * Raycast device. Calls onUpdate whenever a new push arrives so callers can
 * trigger a sync and revalidate their UI.
 *
 * Requires the device to have been bootstrapped (readSecureDeviceId returns a
 * value). If the device is not yet registered the subscription is skipped
 * silently — the 1-minute background poll remains the fallback.
 *
 * Returns an unsubscribe function that tears down the WebSocket/SSE connection.
 * Must be called when the subscribing component unmounts.
 */
export function subscribeToInboxUpdates(onUpdate: InboxUpdateCallback): () => void {
  const { supabaseUrl, supabaseAnonKey } = getExtensionConfig();

  let realtimeClient: RealtimeClient | null = null;
  let apiKeyUnsubscribe: (() => void) | null = null;
  let cancelled = false;

  getSharedClient()
    .readSecureDeviceId()
    .then(async (deviceId) => {
      if (cancelled || !deviceId) return;
      const session = await getAuthSession();
      if (!session) return;
      if (session.authType === "api_key") {
        apiKeyUnsubscribe = subscribeToApiKeyInboxUpdates(onUpdate);
        return;
      }

      realtimeClient = new RealtimeClient(`${supabaseUrl.replace(/\/+$/, "")}/realtime/v1`, {
        params: { apikey: supabaseAnonKey },
        // Forward a freshly loaded token so legacy Supabase-session realtime
        // survives access-token refreshes. API-key sessions use Nibit SSE above.
        accessToken: async () => (await getAuthSession())?.accessToken ?? null,
      });

      const channel = realtimeClient.channel("inbox-updates");
      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "pending_messages",
          filter: `target_device_id=eq.${deviceId}`,
        },
        () => {
          if (!cancelled) onUpdate();
        },
      );
      channel.subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.warn("[nibit] inbox realtime: channel error");
        }
      });
      realtimeClient.connect();
    })
    .catch((err) => {
      console.warn("[nibit] subscribeToInboxUpdates: setup failed", err);
    });

  return () => {
    cancelled = true;
    apiKeyUnsubscribe?.();
    apiKeyUnsubscribe = null;
    if (realtimeClient) {
      // The Supabase Realtime Phoenix socket calls conn.close() during
      // disconnect teardown, but Raycast's WebSocket transport may not
      // expose a standard .close() method, causing an uncatchable TypeError
      // in an async setTimeout chain. Polyfill .close() as a no-op so
      // teardown proceeds normally and all other cleanup (heartbeat timers,
      // channel teardown, reconnect timer) still runs.
      try {
        const conn = (realtimeClient as unknown as { socketAdapter: { socket: { conn: Record<string, unknown> } } })
          .socketAdapter.socket.conn;
        if (conn && typeof conn.close !== "function") {
          conn.close = () => {};
        }
      } catch {
        // If internals changed, proceed anyway — disconnect may still work.
      }
      realtimeClient.disconnect().catch(() => {});
      realtimeClient = null;
    }
  };
}
