import { useEffect, useRef, useState } from "react";
import { clientIp, readTunnelCounters, TunnelCounters, TunnelReading } from "./traffic";

const SAMPLE_INTERVAL_MS = 1000;
/** Longest history any chart range shows. */
export const HISTORY_MS = 5 * 60_000;
// A longer wait between samples means the Mac slept or the process stalled, and the
// delta would be spread over time nobody watched.
const MAX_SAMPLE_GAP_MS = 3 * SAMPLE_INTERVAL_MS;
const MAX_SAMPLES = HISTORY_MS / SAMPLE_INTERVAL_MS + 10;

export interface TrafficSample {
  /** When the sample was taken, in ms since the epoch. */
  time: number;
  /** Bytes per second. */
  down: number;
  up: number;
}

export type MonitorState =
  | { status: "off" }
  | { status: "starting" }
  | { status: "live"; iface: string; samples: TrafficSample[] }
  | { status: "unavailable"; reason: string };

interface Track {
  baseline?: TunnelCounters & { time: number };
  samples: TrafficSample[];
}

function record(track: Track, reading: TunnelReading, time: number): MonitorState {
  if ("problem" in reading) {
    track.baseline = undefined;
    return { status: "unavailable", reason: reading.problem };
  }

  const { baseline } = track;
  if (baseline && baseline.iface !== reading.iface) {
    track.samples = [];
  } else if (
    baseline &&
    time - baseline.time <= MAX_SAMPLE_GAP_MS &&
    // Counters going down means the interface was recreated. Skip instead of
    // reporting a negative rate.
    reading.rx >= baseline.rx &&
    reading.tx >= baseline.tx
  ) {
    const seconds = (time - baseline.time) / 1000;
    track.samples = [
      ...track.samples,
      { time, down: (reading.rx - baseline.rx) / seconds, up: (reading.tx - baseline.tx) / seconds },
    ]
      .filter((sample) => sample.time > time - HISTORY_MS)
      .slice(-MAX_SAMPLES);
  }
  track.baseline = { ...reading, time };
  return { status: "live", iface: reading.iface, samples: track.samples };
}

/**
 * Samples the tunnel behind each client address about once a second while mounted, so
 * history keeps building for every connected profile, not just the one on screen. A
 * profile's history is dropped once its address goes away, and starts over when its
 * tunnel moves to a different interface, so data from two tunnels never mixes.
 *
 * Returns a lookup from a client address to its monitor state.
 */
export function useTraffic(clientAddresses: string[]): (clientAddress?: string) => MonitorState {
  const key = [...new Set(clientAddresses.map(clientIp).filter(Boolean))].sort().join(",");
  // Kept outside the effect so a profile connecting or disconnecting doesn't reset the others.
  const tracks = useRef(new Map<string, Track>());
  const [states, setStates] = useState<Record<string, MonitorState>>({});

  useEffect(() => {
    const ips = key ? key.split(",") : [];
    for (const ip of tracks.current.keys()) {
      if (!ips.includes(ip)) tracks.current.delete(ip);
    }
    if (ips.length === 0) {
      setStates({});
      return;
    }

    let cancelled = false;
    let timer: NodeJS.Timeout | undefined;

    async function tick() {
      try {
        const readings = await readTunnelCounters(ips);
        if (cancelled) return;
        const time = Date.now();
        const next: Record<string, MonitorState> = {};
        for (const ip of ips) {
          let track = tracks.current.get(ip);
          if (!track) {
            track = { samples: [] };
            tracks.current.set(ip, track);
          }
          next[ip] = record(track, readings[ip], time);
        }
        setStates(next);
      } catch (error) {
        if (cancelled) return;
        for (const track of tracks.current.values()) track.baseline = undefined;
        const reason = error instanceof Error ? error.message : String(error);
        setStates(Object.fromEntries(ips.map((ip) => [ip, { status: "unavailable", reason } as const])));
      }

      // Scheduling after the read finishes keeps slow reads from piling up.
      if (!cancelled) timer = setTimeout(tick, SAMPLE_INTERVAL_MS);
    }

    tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key]);

  return (clientAddress) => {
    const ip = clientAddress ? clientIp(clientAddress) : "";
    if (!ip) return { status: "off" };
    return states[ip] ?? { status: "starting" };
  };
}
