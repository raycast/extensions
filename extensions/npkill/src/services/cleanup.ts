import { rm } from "node:fs/promises";
import { Artifact, CleanupMethod, ScanRoot } from "../types";
import { isWithin, revalidateArtifact } from "./path-validation";

export interface CleanupResult {
  path: string;
  status: "success" | "missing" | "failed";
  error?: string;
  size: number | null;
}

export function planCleanup(visible: Artifact[], selected: ReadonlySet<string>): Artifact[] {
  return visible.filter((artifact) => selected.has(artifact.path));
}

export async function cleanup(
  root: ScanRoot,
  confirmed: readonly Artifact[],
  current: ReadonlyMap<string, Artifact>,
  method: CleanupMethod,
  moveToTrash: (path: string) => Promise<void>,
): Promise<CleanupResult[]> {
  // Freeze the allowlist before the first filesystem operation.
  const allowed = new Map(current);
  const items = [...confirmed];
  const paths = new Set(items.map((item) => item.path));
  if (paths.size !== items.length || items.some((item) => allowed.get(item.path) !== item))
    throw new Error("Selection changed. Review the current results again.");
  if (items.some((item) => items.some((other) => item !== other && isWithin(item.path, other.path))))
    throw new Error("Selection contains overlapping directories. Clean them separately.");
  const results: CleanupResult[] = [];
  for (const item of items) {
    let validated = false;
    try {
      await revalidateArtifact(root, item);
      validated = true;
      if (method === "trash") await moveToTrash(item.path);
      else await rm(item.path, { recursive: true, force: false, maxRetries: 0 });
      results.push({ path: item.path, status: "success", size: item.size });
    } catch (error) {
      // Only a missing source during validation is stale. A Trash service may itself fail
      // with ENOENT (for example a missing destination); that must preserve the result.
      const missing = !validated && (error as NodeJS.ErrnoException).code === "ENOENT";
      results.push({
        path: item.path,
        status: missing ? "missing" : "failed",
        size: item.size,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return results;
}
