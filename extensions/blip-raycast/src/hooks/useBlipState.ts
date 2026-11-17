import { environment, showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { applyBlipPreferences } from "../lib/apply-preferences";
import { getClient, setLaunchListener, userMessage, type StateSnapshot } from "../lib/client";
import { DrpcTimeoutError } from "../lib/drpc";
import { openBlip } from "../lib/endpoint";
import { cleanOutbox } from "../lib/outbox";

const FIRST_CALL_MS = 15000;
const LONG_POLL_MS = 25000;
const RETRY_MS = 3000;
/** During a transfer Blip's state changes many times a second; a few updates a second are plenty to show. */
const MIN_UPDATE_GAP_MS = 250;

interface Options {
  /** Wait to contact (and possibly start) Blip until this is true. */
  execute?: boolean;
  /** Show a toast when Blip goes away after the first load. Off for screens stacked on another that already does. */
  warnOnDisconnect?: boolean;
}

/**
 * Live Blip state. Uses GetState's long-poll, so updates arrive as soon as Blip's state changes
 * (devices coming online, transfer progress, search results) without busy polling.
 * On first load it also applies the Blip settings from the extension preferences and tidies the outbox.
 * If Blip goes away after the first load, the last state stays on screen and a toast says so.
 */
export function useBlipState({ execute = true, warnOnDisconnect = true }: Options = {}) {
  const [snapshot, setSnapshot] = useState<StateSnapshot>();
  const [error, setError] = useState<Error>();

  useEffect(() => {
    if (!execute) return;
    const controller = new AbortController();
    const client = getClient();
    let lastId: string | undefined;
    let first = true;
    let launchToast: Promise<Toast> | undefined;
    const hideLaunchToast = () => {
      launchToast?.then((toast) => toast.hide());
      launchToast = undefined;
    };
    const restoreListener = setLaunchListener(() => {
      launchToast = showToast({ style: Toast.Style.Animated, title: "Starting Blip…" });
    });

    (async () => {
      while (!controller.signal.aborted) {
        try {
          const next = await client.getState({
            lastId,
            timeoutMs: lastId ? LONG_POLL_MS : FIRST_CALL_MS,
            signal: controller.signal,
          });
          if (controller.signal.aborted) return;
          lastId = next.id;
          setSnapshot(next);
          const updatedAt = Date.now();
          setError(undefined);
          hideLaunchToast();
          if (first) {
            first = false;
            cleanOutbox(environment.supportPath, next.state);
            applyBlipPreferences(next.state.config).catch(() => {});
          }
          const wait = MIN_UPDATE_GAP_MS - (Date.now() - updatedAt);
          if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
        } catch (e) {
          if (controller.signal.aborted) return;
          if (e instanceof DrpcTimeoutError && lastId) continue; // Nothing changed; poll again.
          hideLaunchToast();
          setError(e instanceof Error ? e : new Error(String(e)));
          lastId = undefined;
          await new Promise((resolve) => setTimeout(resolve, RETRY_MS));
        }
      }
    })();

    return () => {
      controller.abort();
      hideLaunchToast();
      restoreListener();
    };
  }, [execute]);

  // Blip went away after the first load: keep showing the last state, but say it's stale until it's back.
  const lostToast = useRef<Promise<Toast> | undefined>(undefined);
  useEffect(() => {
    if (!error) {
      lostToast.current?.then((toast) => toast.hide());
      lostToast.current = undefined;
      return;
    }
    if (!warnOnDisconnect || !snapshot || lostToast.current) return;
    lostToast.current = showToast({
      style: Toast.Style.Failure,
      title: "Lost Connection to Blip",
      message: userMessage(error),
      primaryAction: { title: "Open Blip", onAction: () => openBlip().catch(() => {}) },
    });
  }, [error, snapshot, warnOnDisconnect]);

  return { state: snapshot?.state, isLoading: execute && !snapshot && !error, error };
}
