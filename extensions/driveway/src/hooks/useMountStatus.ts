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

  // A slow server can take a moment to appear, so poll rather than
  // refresh once.
  async function pollUntilMounted(entry: { host: string; path?: string }, attempts = 60, intervalMs = 500) {
    for (let i = 0; i < attempts; i++) {
      const mountedShares = await refreshMounted();
      const match = findMountedShare(mountedShares, entry);
      if (match) return match;
      await delay(intervalMs);
    }
    return undefined;
  }

  return { mounted, volumes, refreshMounted, pollUntilMounted };
}
