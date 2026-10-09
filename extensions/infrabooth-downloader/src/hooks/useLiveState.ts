import { useEffect, useState } from "react";
import { getStateSocketUrl } from "../lib/api";
import type { RemoteState } from "../shared/remote-protocol";

const BACKOFF_MS = [1000, 2000, 4000, 8000, 8000];
const INITIAL_FRAME_GRACE_MS = 250;

export type LiveState = { running: false } | { running: true; state: RemoteState | null };

type LiveStateListener = (live: LiveState) => void;

function parseFrame(data: unknown): RemoteState | undefined {
  try {
    return JSON.parse(String(data)) as RemoteState;
  } catch (error) {
    console.error("Ignoring malformed player state frame:", error);
    return undefined;
  }
}

async function openSocket(): Promise<WebSocket | null> {
  try {
    return new WebSocket(await getStateSocketUrl());
  } catch {
    return null;
  }
}

function onlyChanges(listener: LiveStateListener): LiveStateListener {
  let lastSnapshot: string | null = null;
  return (live) => {
    const snapshot = JSON.stringify(live);
    if (snapshot === lastSnapshot) return;
    lastSnapshot = snapshot;
    listener(live);
  };
}

function subscribeLiveState(listener: LiveStateListener): () => void {
  const emit = onlyChanges(listener);
  let disposed = false;
  let socket: WebSocket | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let initialFrameTimer: ReturnType<typeof setTimeout> | undefined;
  let retryCount = 0;

  function scheduleReconnect() {
    emit({ running: false });
    const delay = BACKOFF_MS[Math.min(retryCount, BACKOFF_MS.length - 1)];
    retryCount += 1;
    retryTimer = setTimeout(() => void connect(), delay);
  }

  function listen(ws: WebSocket) {
    ws.onopen = () => {
      retryCount = 0;
      initialFrameTimer = setTimeout(() => emit({ running: true, state: null }), INITIAL_FRAME_GRACE_MS);
    };
    ws.onmessage = (event) => {
      const state = parseFrame(event.data);
      if (!state) return;
      clearTimeout(initialFrameTimer);
      emit({ running: true, state });
    };
    ws.onclose = () => {
      clearTimeout(initialFrameTimer);
      if (!disposed) scheduleReconnect();
    };
  }

  async function connect() {
    const ws = await openSocket();
    if (disposed) {
      ws?.close();
      return;
    }
    if (!ws) {
      scheduleReconnect();
      return;
    }
    socket = ws;
    listen(ws);
  }

  void connect();

  return () => {
    disposed = true;
    clearTimeout(retryTimer);
    clearTimeout(initialFrameTimer);
    socket?.close();
  };
}

export function useLiveState() {
  const [live, setLive] = useState<LiveState>();

  useEffect(() => subscribeLiveState(setLive), []);

  return { live, isLoading: live === undefined };
}
