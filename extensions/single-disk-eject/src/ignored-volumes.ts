/**
 * Names from the Ignored Volumes preference, a comma-separated list compared
 * exactly to mounted volume names. Spaces around each comma are ignored.
 */
export function parseIgnoredVolumes(raw: string | undefined | null): string[] {
  if (raw == null) return [];
  return raw
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
}

export function excludeIgnoredVolumes<T extends { name: string }>(
  volumes: T[],
  ignoredRaw: string | undefined | null,
): T[] {
  const ignored = parseIgnoredVolumes(ignoredRaw);
  if (ignored.length === 0) return volumes;
  return volumes.filter((volume) => ignored.findIndex((name) => name === volume.name) < 0);
}
