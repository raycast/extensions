import { useState } from "react";
import { listMountedShares, findMountedShare, MountLocation } from "../lib/mount";
import { getAllVolumeUsage, VolumeUsage } from "../lib/disk-usage";
import { delay } from "../lib/throttle";

// Shared by every view needing live mount status, so they can't drift.
export function useMountStatus() {
  const [mounted, setMounted] = useState<MountLocation[]>([]);
  const [volumes, setVolumes] = useState<VolumeUsage[]>([]);

  async function refreshMounted() {
    const [mountedShares, usage] = await Promise.all([listMountedShares(), getAllVolumeUsage()]);
    setMounted(mountedShares);
    setVolumes(usage);
    return mountedShares;
  }

  // A slow server can take a moment to appear, so poll rather than refresh
  // once. The interval ramps up: a local mount lands in well under a second
  // and used to sit out the rest of a fixed 500ms tick before being noticed,
  // while a slow server still backs off rather than running `df` in a tight
  // loop for half a minute.
  async function pollUntilMounted(entry: { host: string; path?: string }, timeoutMs = 30_000) {
    const deadline = Date.now() + timeoutMs;
    let interval = 100;

    while (Date.now() < deadline) {
      const mountedShares = await refreshMounted();
      const match = findMountedShare(mountedShares, entry);
      if (match) return match;

      await delay(interval);
      interval = Math.min(Math.round(interval * 1.5), 500);
    }
    return undefined;
  }

  return { mounted, volumes, refreshMounted, pollUntilMounted };
}
