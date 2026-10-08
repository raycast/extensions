import { homedir } from "node:os";
import { join } from "node:path";

export const APP_GROUP_IDENTIFIER = "group.codes.kos.Promptty";
export const SNAPSHOT_FILENAME = "prompts-v1.json";

export function defaultSnapshotPath(homeDirectory = homedir()): string {
  return join(
    homeDirectory,
    "Library",
    "Group Containers",
    APP_GROUP_IDENTIFIER,
    "Library",
    "Application Support",
    "RaycastIntegration",
    SNAPSHOT_FILENAME,
  );
}

export function resolveSnapshotPath(override: string | string[] | undefined, homeDirectory = homedir()): string {
  const selectedPath = Array.isArray(override) ? override.find((path) => path.trim().length > 0) : override;
  return selectedPath?.trim() || defaultSnapshotPath(homeDirectory);
}
