export function formatDriftMs(offsetMs: number | undefined): string {
  if (offsetMs === undefined) return "unsynced";
  const driftMs = Math.round(-offsetMs);
  if (driftMs === 0) return "0 ms";
  const direction = driftMs > 0 ? "ahead" : "behind";
  return `${Math.abs(driftMs)} ms ${direction}`;
}

export function formatRelativeSync(syncedAtMs: number | undefined): string {
  if (syncedAtMs === undefined) return "never";
  const deltaMs = Date.now() - syncedAtMs;
  const deltaSec = Math.round(deltaMs / 1000);
  if (deltaSec < 60) return `${deltaSec}s ago`;
  const deltaMin = Math.round(deltaSec / 60);
  if (deltaMin < 60) return `${deltaMin}m ago`;
  const deltaHour = Math.round(deltaMin / 60);
  return `${deltaHour}h ago`;
}
