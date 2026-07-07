/**
 * Live tool-call stream — ported from `ui/observability/hooks.ts` `useLiveStream`.
 *
 * WebSocket-first (`/api/stream`) with an SSE fallback (`/api/sse`), exactly like
 * the dashboard. The Raycast runtime is Node ≥22, which provides a global
 * `WebSocket`; `EventSource` is newer/experimental, so the SSE fallback is
 * feature-detected and simply skipped when unavailable (WS is the normal path
 * against a local dashboard). Auth rides the `?token=` query param via `wsUrl`/
 * `withToken` since a browser-style WebSocket/EventSource can't set headers.
 */
import { useEffect, useRef } from "react";
import { withToken, wsUrl } from "./api";
import type { LiveMode, ToolEvent } from "./types";

// `EventSource` is only sometimes present in the Node runtime and its ambient
// type varies, so we reference it loosely (feature-detected at runtime) — the
// SSE path is a fallback; WebSocket is the normal route against a local dashboard.
interface SseLike {
  addEventListener(type: string, cb: (ev: { data: string }) => void): void;
  onerror: (() => void) | null;
  readyState: number;
  close(): void;
}
type SseCtor = new (url: string) => SseLike;
const SSE: SseCtor | undefined = (globalThis as { EventSource?: SseCtor })
  .EventSource;

export function useLiveStream(
  onEvent: (e: ToolEvent) => void,
  onMode: (m: LiveMode) => void,
): void {
  const onEventRef = useRef(onEvent);
  const onModeRef = useRef(onMode);
  onEventRef.current = onEvent;
  onModeRef.current = onMode;

  useEffect(() => {
    let closed = false;
    let ws: WebSocket | null = null;
    let es: SseLike | null = null;

    const connectSse = (): void => {
      if (closed) return;
      if (!SSE) {
        onModeRef.current("off");
        return;
      }
      const src = new SSE(withToken("/api/sse"));
      es = src;
      src.addEventListener("hello", () => onModeRef.current("sse"));
      src.addEventListener("tool", (ev) => {
        try {
          onEventRef.current(JSON.parse(ev.data) as ToolEvent);
        } catch {
          /* ignore malformed frame */
        }
      });
      src.onerror = () => {
        if (src.readyState === 0 /* CONNECTING */) onModeRef.current("off");
      };
    };

    const connectWs = (): void => {
      if (closed) return;
      try {
        ws = new WebSocket(wsUrl("/api/stream"));
      } catch {
        connectSse();
        return;
      }
      let opened = false;
      ws.onopen = () => {
        opened = true;
        onModeRef.current("ws");
      };
      ws.onerror = () => ws?.close();
      ws.onmessage = (m: MessageEvent) => {
        try {
          const msg = JSON.parse(String(m.data)) as {
            type: string;
            event?: ToolEvent;
          };
          if (msg.type === "event" && msg.event) onEventRef.current(msg.event);
        } catch {
          /* ignore malformed frame */
        }
      };
      ws.onclose = () => {
        if (closed) return;
        onModeRef.current("off");
        if (opened) setTimeout(connectWs, 2000);
        else connectSse();
      };
    };

    connectWs();
    return () => {
      closed = true;
      ws?.close();
      es?.close();
    };
  }, []);
}
