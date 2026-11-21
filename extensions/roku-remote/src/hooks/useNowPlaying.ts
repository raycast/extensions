import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "../lib/preferences";
import { describeRokuError } from "../lib/roku";
import { loadIcon } from "../lib/icons";
import type { RokuApp, RokuDevice, RokuMediaPlayer } from "../lib/types";

export interface NowPlaying {
  info?: RokuDevice;
  app?: RokuApp;
  player?: RokuMediaPlayer;
  icon?: string;
  error?: string;
  isLoading: boolean;
  updatedAt?: number;
}

/** Polls device info, active app and playback state while a view is open. */
export function useNowPlaying(device: RokuDevice | undefined, intervalMs = 4000) {
  const [state, setState] = useState<NowPlaying>({ isLoading: true });
  const generation = useRef(0);

  const refresh = useCallback(async () => {
    if (!device) return;
    const current = ++generation.current;
    const client = createClient(device);
    const [info, app, player] = await Promise.allSettled([
      client.getDeviceInfo(),
      client.getActiveApp(),
      client.getMediaPlayer(),
    ]);
    if (current !== generation.current) return;
    if (info.status === "rejected") {
      setState((previous) => ({ ...previous, isLoading: false, error: describeRokuError(info.reason) }));
      return;
    }
    if (info.value.id !== device.id) {
      setState({
        isLoading: false,
        error: "This address now belongs to a different Roku. Discover TVs again in Manage TVs.",
      });
      return;
    }
    const activeApp = app.status === "fulfilled" ? app.value : undefined;
    const icon = activeApp && activeApp.id !== "home" ? await loadIcon(device, activeApp.id) : undefined;
    if (current !== generation.current) return;
    setState({
      info: info.value,
      app: activeApp,
      player: player.status === "fulfilled" ? player.value : undefined,
      icon,
      isLoading: false,
      updatedAt: Date.now(),
    });
  }, [device?.id, device?.host]);

  useEffect(() => {
    if (!device) return;
    setState({ isLoading: true });
    // Wait for each refresh to finish before scheduling the next one, so a slow
    // or unreachable TV reports its error instead of being superseded forever.
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      await refresh();
      if (!stopped) timer = setTimeout(() => void poll(), intervalMs);
    };
    void poll();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      generation.current += 1;
    };
  }, [refresh, intervalMs]);

  return { ...state, refresh };
}

export function formatTime(ms?: number): string | undefined {
  if (ms === undefined || !Number.isFinite(ms)) return undefined;
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

export function playerLabel(state?: string): string | undefined {
  switch (state) {
    case "play":
      return "Playing";
    case "pause":
      return "Paused";
    case "buffer":
      return "Buffering";
    case "open":
    case "startup":
      return "Loading";
    case "stop":
    case "close":
      return "Stopped";
    default:
      return undefined;
  }
}
