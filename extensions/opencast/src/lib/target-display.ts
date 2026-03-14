import type { OpencodeTarget, RecentTarget } from "./types";

function baseDirectoryName(directory: string): string {
  const normalized = directory.replace(/\/+$/, "");
  const segments = normalized.split("/");
  return segments[segments.length - 1] || directory;
}

export function targetDropdownTitle(
  target: OpencodeTarget | RecentTarget,
): string {
  const base = baseDirectoryName(target.directory);
  return target.workspace ? `${base} (${target.workspace})` : base;
}
